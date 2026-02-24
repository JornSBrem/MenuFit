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

  if (!response.ok) {
    throw new Error(`PG request failed (${response.status}) for ${task.requestUrl}`);
  }

  return response.json();
};
