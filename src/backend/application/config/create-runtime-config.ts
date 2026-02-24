import {
  createDefaultRuntimeConfig,
  DEFAULT_CONFIG_DEFINITIONS,
  type RuntimeConfigStore,
} from "../../../shared/config/index.ts";
import { resolveEnvSecrets } from "./resolve-env-secrets.ts";

export const createBackendRuntimeConfig = (
  env: Record<string, string | undefined>,
): RuntimeConfigStore => {
  const values = resolveEnvSecrets(env, {
    knownKeys: DEFAULT_CONFIG_DEFINITIONS.map((definition) => definition.key),
  });
  return createDefaultRuntimeConfig(values);
};
