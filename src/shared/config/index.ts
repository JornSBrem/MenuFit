import { DEFAULT_CONFIG_DEFINITIONS } from "./default-definitions";
import { RuntimeConfigStore } from "./runtime-config";

export { DEFAULT_CONFIG_DEFINITIONS } from "./default-definitions";
export { RuntimeConfigStore } from "./runtime-config";
export type {
  ConfigDefinition,
  ConfigKind,
  ConfigMeta,
  JsonValue,
  PublicConfigEntry,
} from "./types";
export { ConfigError } from "./types";

export const createDefaultRuntimeConfig = (initialValues?: Record<string, unknown>) =>
  new RuntimeConfigStore(DEFAULT_CONFIG_DEFINITIONS, initialValues);
