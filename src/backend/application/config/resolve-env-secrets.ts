import { readFileSync } from "node:fs";

const SECRET_FILE_SUFFIX = "_FILE";

const trimSecret = (value: string): string => value.replace(/[\r\n]+$/, "");

const readSecretFromFile = (path: string): string => readFileSync(path, "utf8");

export class SecretConfigError extends Error {
  readonly code: string;

  readonly key: string;

  readonly filePath?: string;

  constructor(
    code: string,
    message: string,
    key: string,
    filePath?: string,
  ) {
    super(message);
    this.name = "SecretConfigError";
    this.code = code;
    this.key = key;
    this.filePath = filePath;
  }
}

export interface ResolveEnvSecretsOptions {
  readSecretFromFile?: (path: string) => string;
  knownKeys?: string[];
}

export const resolveEnvSecrets = (
  env: Record<string, string | undefined>,
  options?: ResolveEnvSecretsOptions,
): Record<string, unknown> => {
  const values: Record<string, unknown> = {};
  const readSecret = options?.readSecretFromFile ?? readSecretFromFile;
  const knownKeys = new Set(options?.knownKeys ?? []);

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined || key.endsWith(SECRET_FILE_SUFFIX)) {
      continue;
    }
    values[key] = value;
  }

  for (const [fileKey, filePathValue] of Object.entries(env)) {
    if (!fileKey.endsWith(SECRET_FILE_SUFFIX)) {
      continue;
    }
    if (typeof filePathValue !== "string" || !filePathValue.trim()) {
      continue;
    }

    const baseKey = fileKey.slice(0, -SECRET_FILE_SUFFIX.length);
    if (!baseKey || (knownKeys.size > 0 && !knownKeys.has(baseKey))) {
      continue;
    }

    const existing = values[baseKey];
    if (typeof existing === "string" && existing.length > 0) {
      continue;
    }

    try {
      const secretValue = trimSecret(readSecret(filePathValue.trim()));
      if (!secretValue) {
        throw new SecretConfigError(
          "EMPTY_SECRET_FILE",
          `Secret file for key ${baseKey} is empty.`,
          baseKey,
          filePathValue,
        );
      }
      values[baseKey] = secretValue;
    } catch (error) {
      if (error instanceof SecretConfigError) {
        throw error;
      }
      throw new SecretConfigError(
        "SECRET_FILE_READ_FAILED",
        `Secret file for key ${baseKey} could not be read.`,
        baseKey,
        filePathValue,
      );
    }
  }

  return values;
};
