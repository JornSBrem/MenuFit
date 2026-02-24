export type ConfigKind = "string" | "number" | "boolean" | "url" | "json";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ConfigMeta {
  hotReload: boolean;
  sensitive: boolean;
  restartRequired: boolean;
}

export interface ConfigDefinition<K extends string = string, V = unknown> {
  key: K;
  description: string;
  kind: ConfigKind;
  defaultValue: V;
  meta: ConfigMeta;
}

export interface PublicConfigEntry {
  key: string;
  value: unknown;
  meta: ConfigMeta;
}

export class ConfigError extends Error {
  readonly key: string;

  constructor(
    message: string,
    key: string,
  ) {
    super(message);
    this.name = "ConfigError";
    this.key = key;
  }
}
