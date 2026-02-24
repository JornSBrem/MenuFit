import { DEFAULT_CONFIG_DEFINITIONS } from "./default-definitions.ts";
import { RuntimeConfigStore } from "./runtime-config.ts";

export { DEFAULT_CONFIG_DEFINITIONS } from "./default-definitions.ts";
export { RuntimeConfigStore } from "./runtime-config.ts";
export type {
  ConfigDefinition,
  ConfigKind,
  ConfigMeta,
  JsonValue,
  PublicConfigEntry,
} from "./types.ts";
export { ConfigError } from "./types.ts";

export const createDefaultRuntimeConfig = (initialValues?: Record<string, unknown>) =>
  new RuntimeConfigStore(DEFAULT_CONFIG_DEFINITIONS, initialValues);
