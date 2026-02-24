interface ApiEnvelope {
  ok: boolean;
  data?: unknown;
  error?: {
    code?: string;
    message?: string;
    hint?: string;
  };
}

type ContractValidator = (data: unknown) => string | null;

const asBoolean = (value: string | undefined): boolean => value?.trim().toLowerCase() === "true";

const asPositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value : null);

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const fetchEnvelope = async (url: string, token?: string): Promise<ApiEnvelope> => {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let envelope: ApiEnvelope;
  try {
    envelope = (await response.json()) as ApiEnvelope;
  } catch {
    throw new Error(`Endpoint did not return JSON envelope: ${url}`);
  }

  if (!response.ok || !envelope.ok) {
    const code = envelope.error?.code ?? `HTTP_${response.status}`;
    const message = envelope.error?.message ?? "Unknown error";
    const hint = envelope.error?.hint ? ` (${envelope.error.hint})` : "";
    throw new Error(`${url} => ${code}: ${message}${hint}`);
  }

  return envelope;
};

const validateWeekSummary: ContractValidator = (data) => {
  if (!isRecord(data)) {
    return "summary data must be an object";
  }
  if (!isRecord(data.weekPlan)) {
    return "weekPlan missing";
  }
  if (!asString(data.weekPlan.weekPlanId)) {
    return "weekPlan.weekPlanId missing";
  }
  if (!isRecord(data.matchStatus) || asNumber(data.matchStatus.coverageScore) === null) {
    return "matchStatus.coverageScore missing";
  }
  if (!isRecord(data.cartPlan) || !asString(data.cartPlan.cartPlanId)) {
    return "cartPlan.cartPlanId missing";
  }
  return null;
};

const validateWeekGroceries: ContractValidator = (data) => {
  if (!isRecord(data)) {
    return "groceries data must be an object";
  }
  if (!asString(data.weekPlanId)) {
    return "weekPlanId missing";
  }
  if (!Array.isArray(data.groceries)) {
    return "groceries must be an array";
  }
  if (!Array.isArray(data.reconcile)) {
    return "reconcile must be an array";
  }
  return null;
};

const validateSystemHealth: ContractValidator = (data) => {
  if (!isRecord(data)) {
    return "health data must be an object";
  }
  const status = asString(data.status);
  if (status !== "ok" && status !== "degraded") {
    return "status must be ok or degraded";
  }
  if (!isRecord(data.components)) {
    return "components missing";
  }
  return null;
};

const validateMatchQueue: ContractValidator = (data) => {
  if (!Array.isArray(data)) {
    return "match queue data must be an array";
  }
  if (data.length === 0) {
    return null;
  }
  const first = data[0];
  if (!isRecord(first) || !asString(first.itemId) || !asString(first.status)) {
    return "match queue item shape mismatch";
  }
  return null;
};

const run = async (): Promise<number> => {
  const baseUrl = process.env.LIVE_CONTRACT_BASE_URL?.trim();
  const token = process.env.LIVE_CONTRACT_AUTH_TOKEN?.trim();
  const required = asBoolean(process.env.LIVE_CONTRACT_REQUIRE);

  if (!baseUrl) {
    if (required) {
      console.error("LIVE_CONTRACT_BASE_URL is required but missing.");
      return 1;
    }
    console.log("Live contract validation skipped (LIVE_CONTRACT_BASE_URL not set).");
    return 0;
  }

  const year = asPositiveInt(process.env.LIVE_CONTRACT_YEAR, 2026);
  const week = asPositiveInt(process.env.LIVE_CONTRACT_WEEK, 9);
  const kcal = asPositiveInt(process.env.LIVE_CONTRACT_KCAL, 1800);
  const basePersons = asPositiveInt(process.env.LIVE_CONTRACT_BASE_PERSONS, 2);
  const query = `year=${year}&week=${week}&kcal=${kcal}&basePersons=${basePersons}`;

  const checks: Array<{
    name: string;
    url: string;
    validate: ContractValidator;
  }> = [
    {
      name: "week-summary",
      url: `${baseUrl}/api/v3/week/summary?${query}`,
      validate: validateWeekSummary,
    },
    {
      name: "week-groceries",
      url: `${baseUrl}/api/v3/week/groceries?${query}`,
      validate: validateWeekGroceries,
    },
    {
      name: "system-health",
      url: `${baseUrl}/api/v3/system/health`,
      validate: validateSystemHealth,
    },
    {
      name: "match-queue",
      url: `${baseUrl}/api/v3/match/queue`,
      validate: validateMatchQueue,
    },
  ];

  const failures: string[] = [];
  for (const check of checks) {
    try {
      const envelope = await fetchEnvelope(check.url, token);
      const shapeError = check.validate(envelope.data);
      if (shapeError) {
        failures.push(`${check.name}: ${shapeError}`);
      } else {
        console.log(`PASS ${check.name}`);
      }
    } catch (error) {
      failures.push(`${check.name}: ${String(error)}`);
    }
  }

  if (failures.length > 0) {
    console.error("Live contract validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    return 1;
  }

  console.log("Live contract validation passed.");
  return 0;
};

run()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(`Unexpected live contract checker failure: ${String(error)}`);
    process.exitCode = 1;
  });
