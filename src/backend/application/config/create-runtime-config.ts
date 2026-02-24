import { createDefaultRuntimeConfig, type RuntimeConfigStore } from "../../../shared/config";

export const createBackendRuntimeConfig = (
  env: Record<string, string | undefined>,
): RuntimeConfigStore => {
  const values: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) {
      values[key] = value;
    }
  }

  return createDefaultRuntimeConfig(values);
};
