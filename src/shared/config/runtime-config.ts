import type { ConfigDefinition, ConfigMeta, PublicConfigEntry } from "./types";
import { ConfigError } from "./types";

const REDACTED_VALUE = "***REDACTED***";

export class RuntimeConfigStore {
  private readonly definitions = new Map<string, ConfigDefinition>();
  private readonly values = new Map<string, unknown>();

  constructor(
    definitions: readonly ConfigDefinition[],
    initialValues?: Record<string, unknown>,
  ) {
    for (const definition of definitions) {
      this.definitions.set(definition.key, definition);
      this.values.set(definition.key, definition.defaultValue);
    }

    if (initialValues) {
      this.applyValues(initialValues);
    }
  }

  get<T = unknown>(key: string): T {
    this.assertDefinitionExists(key);
    return this.values.get(key) as T;
  }

  set(key: string, rawValue: unknown): unknown {
    const definition = this.getDefinition(key);
    const parsedValue = this.parseRaw(definition, rawValue);
    this.values.set(key, parsedValue);
    return parsedValue;
  }

  applyValues(values: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(values)) {
      if (!this.definitions.has(key) || value === undefined) {
        continue;
      }
      this.set(key, value);
    }
  }

  metadata(key: string): ConfigMeta {
    return this.getDefinition(key).meta;
  }

  listKeys(): string[] {
    return Array.from(this.definitions.keys()).sort();
  }

  toPublicEntries(): PublicConfigEntry[] {
    return this.listKeys().map((key) => {
      const definition = this.getDefinition(key);
      const rawValue = this.values.get(key);
      return {
        key,
        value: definition.meta.sensitive ? REDACTED_VALUE : rawValue,
        meta: definition.meta,
      };
    });
  }

  private getDefinition(key: string): ConfigDefinition {
    this.assertDefinitionExists(key);
    return this.definitions.get(key) as ConfigDefinition;
  }

  private assertDefinitionExists(key: string): void {
    if (!this.definitions.has(key)) {
      throw new ConfigError(`Unknown config key: ${key}`, key);
    }
  }

  private parseRaw(definition: ConfigDefinition, rawValue: unknown): unknown {
    if (rawValue === null || rawValue === undefined) {
      return definition.defaultValue;
    }

    switch (definition.kind) {
      case "string":
        return String(rawValue);
      case "number":
        return this.parseNumber(definition.key, rawValue);
      case "boolean":
        return this.parseBoolean(definition.key, rawValue);
      case "url":
        return this.parseUrl(definition.key, rawValue);
      case "json":
        return this.parseJson(definition.key, rawValue);
      default:
        throw new ConfigError(`Unsupported config kind: ${definition.kind}`, definition.key);
    }
  }

  private parseNumber(key: string, rawValue: unknown): number {
    const numericValue = typeof rawValue === "number" ? rawValue : Number(rawValue);
    if (!Number.isFinite(numericValue)) {
      throw new ConfigError(`Invalid number for key: ${key}`, key);
    }
    return numericValue;
  }

  private parseBoolean(key: string, rawValue: unknown): boolean {
    if (typeof rawValue === "boolean") {
      return rawValue;
    }

    const text = String(rawValue).toLowerCase();
    if (["true", "1", "yes", "on"].includes(text)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(text)) {
      return false;
    }

    throw new ConfigError(`Invalid boolean for key: ${key}`, key);
  }

  private parseUrl(key: string, rawValue: unknown): string {
    const value = String(rawValue);
    try {
      // Validate the URL string, but keep the original string for templates.
      // Templates can still include placeholders like {week}.
      new URL(value.replace("{week}", "1").replace("{dayId}", "1").replace("{recipeId}", "x"));
      return value;
    } catch {
      throw new ConfigError(`Invalid URL value for key: ${key}`, key);
    }
  }

  private parseJson(key: string, rawValue: unknown): unknown {
    if (typeof rawValue === "string") {
      try {
        return JSON.parse(rawValue);
      } catch {
        throw new ConfigError(`Invalid JSON string for key: ${key}`, key);
      }
    }

    if (typeof rawValue === "object") {
      return rawValue;
    }

    throw new ConfigError(`Invalid JSON value for key: ${key}`, key);
  }
}
