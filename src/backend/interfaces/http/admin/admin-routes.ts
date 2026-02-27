import {
  AdminOperationsService,
  type CutoverChecklistGateInput,
} from "../../../application/admin/admin-operations-service.ts";
import type { OperationalTelemetryService, TelemetryRequestOutcome } from "../../../application/observability/index.ts";
import type { RequestSecurityPolicy } from "../../../application/security/request-security-policy.ts";
import {
  type AdminSessionContext,
  type AnySessionContext,
  requireAdminSession,
  SessionContextError,
} from "../auth/session-context.ts";

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    hint?: string;
  };
}

export interface IngestBody {
  operationId: string;
  weeks: number[];
  basePersons: number[];
}

export interface RecomputeBody {
  operationId: string;
  transformVersion: string;
  week: number;
  kcal: number;
  basePersons: number;
}

export interface ConfigUpdateBody {
  operationId: string;
  key: string;
  value: unknown;
}

export interface CleanupBody {
  operationId: string;
  dryRun: boolean;
  targets: string[];
}

export interface CutoverChecklistBody {
  operationId: string;
  gates: CutoverChecklistGateInput[];
}

const forbidden = (error: SessionContextError): ApiEnvelope<never> => ({
  ok: false,
  error: {
    code: error.code,
    message: error.message,
    hint: error.hint,
  },
});

const invalidBody = (hint: string): ApiEnvelope<never> => ({
  ok: false,
  error: {
    code: "INVALID_BODY",
    message: "Request body is invalid.",
    hint,
  },
});

const withAdminSession = (
  session: AnySessionContext,
): ApiEnvelope<AdminSessionContext> => {
  try {
    return { ok: true, data: requireAdminSession(session) };
  } catch (error) {
    if (error instanceof SessionContextError) {
      return forbidden(error);
    }
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_SESSION",
        message: "Route requires admin session.",
      },
    };
  }
};

export interface AdminRouteRuntimeOptions {
  securityPolicy?: RequestSecurityPolicy;
  telemetry?: OperationalTelemetryService;
  nowMs?: () => number;
}

const classifyTelemetryOutcome = (result: ApiEnvelope<unknown>): TelemetryRequestOutcome => {
  if (result.ok) {
    return "success";
  }

  const code = result.error?.code;
  if (code === "FORBIDDEN_SESSION" || code === "FORBIDDEN_ROLE") {
    return "forbidden";
  }
  if (code === "RATE_LIMITED") {
    return "rate_limited";
  }
  if (code === "WAF_BLOCKED") {
    return "waf_blocked";
  }
  if (code === "INVALID_BODY") {
    return "client_error";
  }
  return "server_error";
};

const recordTelemetry = (
  routeKey: string,
  startedAtMs: number,
  result: ApiEnvelope<unknown>,
  options?: AdminRouteRuntimeOptions,
): void => {
  const nowMs = options?.nowMs ?? Date.now;
  options?.telemetry?.recordRequest({
    routeKey,
    outcome: classifyTelemetryOutcome(result),
    durationMs: Math.max(0, nowMs() - startedAtMs),
  });
};

const enforceSecurityPolicy = (
  routeKey: string,
  session: AdminSessionContext,
  requiredRole: "operator" | "owner",
  payload: unknown,
  options?: AdminRouteRuntimeOptions,
): ApiEnvelope<never> | null => {
  if (!options?.securityPolicy) {
    return null;
  }

  const decision = options.securityPolicy.authorize({
    routeKey,
    actorId: session.subjectId,
    actorRole: session.adminRole,
    requiredRole,
    payload,
  });

  if (decision.ok) {
    return null;
  }

  return {
    ok: false,
    error: {
      code: decision.error.code,
      message: decision.error.message,
      hint: decision.error.hint,
    },
  };
};

const validateIngestBody = (body: IngestBody): string | null => {
  if (!body.operationId?.trim()) {
    return "operationId is required";
  }
  if (!Array.isArray(body.weeks) || body.weeks.length === 0) {
    return "weeks requires at least one value";
  }
  if (!Array.isArray(body.basePersons) || body.basePersons.length === 0) {
    return "basePersons requires at least one value";
  }
  return null;
};

const validateRecomputeBody = (body: RecomputeBody): string | null => {
  if (!body.operationId?.trim()) {
    return "operationId is required";
  }
  if (!body.transformVersion?.trim()) {
    return "transformVersion is required";
  }
  if (!Number.isInteger(body.week) || body.week < 1 || body.week > 53) {
    return "week must be between 1 and 53";
  }
  if (!Number.isInteger(body.kcal) || body.kcal <= 0) {
    return "kcal must be a positive integer";
  }
  if (!Number.isInteger(body.basePersons) || body.basePersons <= 0) {
    return "basePersons must be a positive integer";
  }
  return null;
};

const validateConfigUpdateBody = (body: ConfigUpdateBody): string | null => {
  if (!body.operationId?.trim()) {
    return "operationId is required";
  }
  if (!body.key?.trim()) {
    return "key is required";
  }
  return null;
};

const validateCleanupBody = (body: CleanupBody): string | null => {
  if (!body.operationId?.trim()) {
    return "operationId is required";
  }
  if (typeof body.dryRun !== "boolean") {
    return "dryRun must be boolean";
  }
  if (!Array.isArray(body.targets) || body.targets.length === 0) {
    return "targets requires at least one value";
  }
  return null;
};

const validateCutoverChecklistBody = (body: CutoverChecklistBody): string | null => {
  if (!body.operationId?.trim()) {
    return "operationId is required";
  }
  if (!Array.isArray(body.gates) || body.gates.length === 0) {
    return "gates requires at least one value";
  }

  for (const gate of body.gates) {
    if (!gate.gateId?.trim()) {
      return "each gate requires gateId";
    }
    if (!gate.label?.trim()) {
      return "each gate requires label";
    }
    if (!Number.isFinite(gate.metric)) {
      return "each gate requires metric as finite number";
    }
    if (gate.minValue === undefined && gate.maxValue === undefined) {
      return "each gate requires minValue and/or maxValue";
    }
    if (
      gate.minValue !== undefined &&
      gate.maxValue !== undefined &&
      gate.minValue > gate.maxValue
    ) {
      return "gate minValue cannot be greater than maxValue";
    }
  }
  return null;
};

export const handleAdminIngest = (
  service: AdminOperationsService,
  session: AnySessionContext,
  body: IngestBody,
  options?: AdminRouteRuntimeOptions,
): ApiEnvelope<ReturnType<AdminOperationsService["runIngest"]>> => {
  const routeKey = "admin.ingest";
  const startedAtMs = (options?.nowMs ?? Date.now)();
  const finalize = (result: ApiEnvelope<ReturnType<AdminOperationsService["runIngest"]>>) => {
    recordTelemetry(routeKey, startedAtMs, result, options);
    return result;
  };

  const sessionResult = withAdminSession(session);
  if (!sessionResult.ok || !sessionResult.data) {
    return finalize(sessionResult);
  }

  const securityError = enforceSecurityPolicy(routeKey, sessionResult.data, "operator", body, options);
  if (securityError) {
    return finalize(securityError);
  }

  const validationError = validateIngestBody(body);
  if (validationError) {
    return finalize(invalidBody(validationError));
  }

  const report = service.runIngest({
    operationId: body.operationId,
    performedBy: sessionResult.data.subjectId,
    weeks: body.weeks,
    basePersons: body.basePersons,
  });
  return finalize({ ok: true, data: report });
};

export const handleAdminRecompute = (
  service: AdminOperationsService,
  session: AnySessionContext,
  body: RecomputeBody,
  options?: AdminRouteRuntimeOptions,
): ApiEnvelope<ReturnType<AdminOperationsService["runRecompute"]>> => {
  const routeKey = "admin.recompute";
  const startedAtMs = (options?.nowMs ?? Date.now)();
  const finalize = (result: ApiEnvelope<ReturnType<AdminOperationsService["runRecompute"]>>) => {
    recordTelemetry(routeKey, startedAtMs, result, options);
    return result;
  };

  const sessionResult = withAdminSession(session);
  if (!sessionResult.ok || !sessionResult.data) {
    return finalize(sessionResult);
  }

  const securityError = enforceSecurityPolicy(routeKey, sessionResult.data, "operator", body, options);
  if (securityError) {
    return finalize(securityError);
  }

  const validationError = validateRecomputeBody(body);
  if (validationError) {
    return finalize(invalidBody(validationError));
  }

  const report = service.runRecompute({
    operationId: body.operationId,
    performedBy: sessionResult.data.subjectId,
    transformVersion: body.transformVersion,
    week: body.week,
    kcal: body.kcal,
    basePersons: body.basePersons,
  });
  return finalize({ ok: true, data: report });
};

export const handleAdminConfigUpdate = (
  service: AdminOperationsService,
  session: AnySessionContext,
  body: ConfigUpdateBody,
  options?: AdminRouteRuntimeOptions,
): ApiEnvelope<ReturnType<AdminOperationsService["updateConfig"]>> => {
  const routeKey = "admin.configUpdate";
  const startedAtMs = (options?.nowMs ?? Date.now)();
  const finalize = (result: ApiEnvelope<ReturnType<AdminOperationsService["updateConfig"]>>) => {
    recordTelemetry(routeKey, startedAtMs, result, options);
    return result;
  };

  const sessionResult = withAdminSession(session);
  if (!sessionResult.ok || !sessionResult.data) {
    return finalize(sessionResult);
  }

  const securityError = enforceSecurityPolicy(routeKey, sessionResult.data, "owner", body, options);
  if (securityError) {
    return finalize(securityError);
  }

  const validationError = validateConfigUpdateBody(body);
  if (validationError) {
    return finalize(invalidBody(validationError));
  }

  const report = service.updateConfig({
    operationId: body.operationId,
    performedBy: sessionResult.data.subjectId,
    key: body.key,
    value: body.value,
  });
  return finalize({ ok: true, data: report });
};

export const handleAdminCleanup = (
  service: AdminOperationsService,
  session: AnySessionContext,
  body: CleanupBody,
  options?: AdminRouteRuntimeOptions,
): ApiEnvelope<ReturnType<AdminOperationsService["runCleanup"]>> => {
  const routeKey = "admin.cleanup";
  const startedAtMs = (options?.nowMs ?? Date.now)();
  const finalize = (result: ApiEnvelope<ReturnType<AdminOperationsService["runCleanup"]>>) => {
    recordTelemetry(routeKey, startedAtMs, result, options);
    return result;
  };

  const sessionResult = withAdminSession(session);
  if (!sessionResult.ok || !sessionResult.data) {
    return finalize(sessionResult);
  }

  const securityError = enforceSecurityPolicy(routeKey, sessionResult.data, "operator", body, options);
  if (securityError) {
    return finalize(securityError);
  }

  const validationError = validateCleanupBody(body);
  if (validationError) {
    return finalize(invalidBody(validationError));
  }

  const report = service.runCleanup({
    operationId: body.operationId,
    performedBy: sessionResult.data.subjectId,
    dryRun: body.dryRun,
    targets: body.targets,
  });
  return finalize({ ok: true, data: report });
};

export const handleAdminCutoverChecklist = (
  service: AdminOperationsService,
  session: AnySessionContext,
  body: CutoverChecklistBody,
  options?: AdminRouteRuntimeOptions,
): ApiEnvelope<ReturnType<AdminOperationsService["runCutoverChecklist"]>> => {
  const routeKey = "admin.cutoverChecklist";
  const startedAtMs = (options?.nowMs ?? Date.now)();
  const finalize = (
    result: ApiEnvelope<ReturnType<AdminOperationsService["runCutoverChecklist"]>>,
  ) => {
    recordTelemetry(routeKey, startedAtMs, result, options);
    return result;
  };

  const sessionResult = withAdminSession(session);
  if (!sessionResult.ok || !sessionResult.data) {
    return finalize(sessionResult);
  }

  const securityError = enforceSecurityPolicy(routeKey, sessionResult.data, "owner", body, options);
  if (securityError) {
    return finalize(securityError);
  }

  const validationError = validateCutoverChecklistBody(body);
  if (validationError) {
    return finalize(invalidBody(validationError));
  }

  const report = service.runCutoverChecklist({
    operationId: body.operationId,
    performedBy: sessionResult.data.subjectId,
    gates: body.gates,
  });
  return finalize({ ok: true, data: report });
};

export interface AdminRouteHandlers {
  ingest: (session: AnySessionContext, body: IngestBody) => ApiEnvelope<ReturnType<AdminOperationsService["runIngest"]>>;
  recompute: (
    session: AnySessionContext,
    body: RecomputeBody,
  ) => ApiEnvelope<ReturnType<AdminOperationsService["runRecompute"]>>;
  configUpdate: (
    session: AnySessionContext,
    body: ConfigUpdateBody,
  ) => ApiEnvelope<ReturnType<AdminOperationsService["updateConfig"]>>;
  cleanup: (
    session: AnySessionContext,
    body: CleanupBody,
  ) => ApiEnvelope<ReturnType<AdminOperationsService["runCleanup"]>>;
  cutoverChecklist: (
    session: AnySessionContext,
    body: CutoverChecklistBody,
  ) => ApiEnvelope<ReturnType<AdminOperationsService["runCutoverChecklist"]>>;
}

export const createAdminRouteHandlers = (
  service: AdminOperationsService,
  options?: AdminRouteRuntimeOptions,
): AdminRouteHandlers => ({
  ingest: (session, body) => handleAdminIngest(service, session, body, options),
  recompute: (session, body) => handleAdminRecompute(service, session, body, options),
  configUpdate: (session, body) => handleAdminConfigUpdate(service, session, body, options),
  cleanup: (session, body) => handleAdminCleanup(service, session, body, options),
  cutoverChecklist: (session, body) => handleAdminCutoverChecklist(service, session, body, options),
});
