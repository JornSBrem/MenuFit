import assert from "node:assert/strict";
import test from "node:test";

import { createBackendRuntimeConfig } from "./create-runtime-config.ts";
import { resolveEnvSecrets, SecretConfigError } from "./resolve-env-secrets.ts";

test("backend runtime config loads explicit env secrets", () => {
  const config = createBackendRuntimeConfig({
    LLM_API_KEY: "env-secret",
  });
  assert.equal(config.get("LLM_API_KEY"), "env-secret");
});

test("secret resolver supports *_FILE fallback", () => {
  const resolved = resolveEnvSecrets(
    {
      LLM_API_KEY_FILE: "/var/secrets/llm-api-key",
    },
    {
      knownKeys: ["LLM_API_KEY"],
      readSecretFromFile: () => "secret-from-file\n",
    },
  );
  assert.equal(resolved.LLM_API_KEY, "secret-from-file");
});

test("env value takes precedence over *_FILE secret fallback", () => {
  const resolved = resolveEnvSecrets(
    {
      LLM_API_KEY: "explicit-secret",
      LLM_API_KEY_FILE: "/var/secrets/llm-api-key",
    },
    {
      knownKeys: ["LLM_API_KEY"],
      readSecretFromFile: () => "secret-from-file\n",
    },
  );
  assert.equal(resolved.LLM_API_KEY, "explicit-secret");
});

test("secret resolver throws explicit error for unreadable secret files", () => {
  assert.throws(
    () =>
      resolveEnvSecrets(
        {
          LLM_API_KEY_FILE: "/var/secrets/missing",
        },
        {
          knownKeys: ["LLM_API_KEY"],
          readSecretFromFile: () => {
            throw new Error("ENOENT");
          },
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof SecretConfigError);
      assert.equal(error.code, "SECRET_FILE_READ_FAILED");
      assert.equal(error.key, "LLM_API_KEY");
      return true;
    },
  );
});
