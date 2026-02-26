import type { RuntimeConfigStore } from "../../../shared/config";
import type { IngestTask } from "../../application/ingest";

const parseExtraHeaders = (raw: unknown): Record<string, string> => {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const entries = Object.entries(raw as Record<string, unknown>)
    .filter(([, value]) => typeof value === "string")
    .map(([key, value]) => [key, value as string]);
  return Object.fromEntries(entries);
};

/** Gooit deze error bij HTTP 429 zodat de caller de retry-after kan respecteren */
export class PgRateLimitError extends Error {
  readonly retryAfterMs: number;
  constructor(url: string, retryAfterMs: number) {
    super(`PG request failed (429) for ${url}`);
    this.name = "PgRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export const fetchPgJson = async (
  task: IngestTask,
  config: RuntimeConfigStore,
): Promise<unknown> => {
  const extraHeadersRaw = config.get("PG_EXTRA_HEADERS_JSON");
  const extraHeaders = parseExtraHeaders(extraHeadersRaw);

  const response = await fetch(task.requestUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...extraHeaders,
    },
  });

  if (response.status === 429) {
    // Respecteer Retry-After header (in seconden), anders 60s standaard
    const retryAfter = response.headers.get("retry-after");
    const retryAfterMs = retryAfter ? parseFloat(retryAfter) * 1000 : 60_000;
    throw new PgRateLimitError(task.requestUrl, retryAfterMs);
  }

  if (!response.ok) {
    throw new Error(`PG request failed (${response.status}) for ${task.requestUrl}`);
  }

  return response.json();
};
