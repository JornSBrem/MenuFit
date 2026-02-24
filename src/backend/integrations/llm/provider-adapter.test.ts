import assert from "node:assert/strict";
import test from "node:test";

import {
  completeWithLlmFallback,
  loadLlmProviderConfig,
  validateLlmProviderConfig,
} from "./provider-adapter.ts";

type ConfigStoreStub = {
  get<T = unknown>(key: string): T;
};

const createConfig = (overrides: Record<string, unknown> = {}): ConfigStoreStub => {
  const values = {
    LLM_PROVIDER: "openai",
    LLM_BASE_URL: "https://api.openai.com/v1",
    LLM_API_KEY: "test-key",
    LLM_API_VERSION: "2024-10-21",
    LLM_MODEL: "gpt-4o-mini",
    LLM_AZURE_DEPLOYMENT: "gpt-4o-mini-deploy",
    ...overrides,
  };

  return {
    get<T = unknown>(key: string): T {
      return values[key as keyof typeof values] as T;
    },
  };
};

test("preflight validates OpenAI config", () => {
  const config = loadLlmProviderConfig(createConfig() as never);
  const errors = validateLlmProviderConfig(config);
  assert.deepEqual(errors, []);
});

test("preflight validates Azure endpoint and deployment mapping", () => {
  const invalidAzure = loadLlmProviderConfig(
    createConfig({
      LLM_PROVIDER: "azure",
      LLM_BASE_URL: "https://api.openai.com/v1",
      LLM_AZURE_DEPLOYMENT: "",
    }) as never,
  );

  const errors = validateLlmProviderConfig(invalidAzure);
  assert.ok(errors.some((error) => error.includes(".openai.azure.com")));
  assert.ok(errors.some((error) => error.includes("LLM_AZURE_DEPLOYMENT")));
});

test("preflight rejects unsupported provider value", () => {
  const invalidProvider = loadLlmProviderConfig(
    createConfig({
      LLM_PROVIDER: "anthropic",
    }) as never,
  );

  const errors = validateLlmProviderConfig(invalidProvider);
  assert.ok(errors.some((error) => error.includes("LLM_PROVIDER")));
});

test("completeWithLlmFallback returns fallback on preflight failure", async () => {
  const result = await completeWithLlmFallback(
    createConfig({
      LLM_PROVIDER: "azure",
      LLM_BASE_URL: "https://api.openai.com/v1",
      LLM_AZURE_DEPLOYMENT: "",
    }) as never,
    {
      userPrompt: "Ping",
      fallbackOutput: "fallback",
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.usedFallback, true);
  assert.equal(result.reason, "preflight_failed");
  assert.equal(result.text, "fallback");
  assert.ok(result.preflightErrors.length > 0);
});

test("completeWithLlmFallback returns fallback on network failure", async () => {
  const result = await completeWithLlmFallback(
    createConfig() as never,
    {
      userPrompt: "Ping",
      fallbackOutput: "fallback",
    },
    async () => {
      throw new Error("network down");
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "network_error");
  assert.equal(result.text, "fallback");
});

test("completeWithLlmFallback maps OpenAI request and parses success response", async () => {
  let calledUrl = "";
  let calledInit: RequestInit | undefined;

  const result = await completeWithLlmFallback(
    createConfig({
      LLM_PROVIDER: "openai",
      LLM_BASE_URL: "https://api.openai.com/v1",
    }) as never,
    {
      userPrompt: "Geef een korte samenvatting",
      systemPrompt: "Je bent een assistent",
      fallbackOutput: "fallback",
      maxOutputTokens: 120,
    },
    async (input, init) => {
      calledUrl = String(input);
      calledInit = init;
      return new Response(
        JSON.stringify({
          output_text: "Samenvatting",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  );

  assert.equal(calledUrl, "https://api.openai.com/v1/responses");
  assert.equal(result.ok, true);
  assert.equal(result.usedFallback, false);
  assert.equal(result.text, "Samenvatting");

  const headers = calledInit?.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer test-key");
  const body = JSON.parse(String(calledInit?.body));
  assert.equal(body.model, "gpt-4o-mini");
  assert.equal(body.max_output_tokens, 120);
});

test("completeWithLlmFallback maps Azure request and parses success response", async () => {
  let calledUrl = "";
  let calledInit: RequestInit | undefined;

  const result = await completeWithLlmFallback(
    createConfig({
      LLM_PROVIDER: "azure",
      LLM_BASE_URL: "https://menufit.openai.azure.com",
      LLM_AZURE_DEPLOYMENT: "menufit-gpt4o-mini",
      LLM_MODEL: "gpt-4o-mini",
      LLM_API_VERSION: "2024-10-21",
    }) as never,
    {
      userPrompt: "Maak een lijst",
      fallbackOutput: "fallback",
      maxOutputTokens: 80,
    },
    async (input, init) => {
      calledUrl = String(input);
      calledInit = init;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "Antwoord uit Azure",
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  );

  assert.equal(
    calledUrl,
    "https://menufit.openai.azure.com/openai/deployments/menufit-gpt4o-mini/chat/completions?api-version=2024-10-21",
  );
  assert.equal(result.ok, true);
  assert.equal(result.text, "Antwoord uit Azure");

  const headers = calledInit?.headers as Record<string, string>;
  assert.equal(headers["api-key"], "test-key");
  const body = JSON.parse(String(calledInit?.body));
  assert.equal(body.model, "gpt-4o-mini");
  assert.equal(body.max_tokens, 80);
});

test("completeWithLlmFallback returns fallback on provider non-200 response", async () => {
  const result = await completeWithLlmFallback(
    createConfig() as never,
    {
      userPrompt: "Ping",
      fallbackOutput: "fallback",
    },
    async () => new Response("error", { status: 500 }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "provider_error");
  assert.equal(result.text, "fallback");
});
