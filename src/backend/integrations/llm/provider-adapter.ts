import type { RuntimeConfigStore } from "../../../shared/config";
import type {
  LlmCompletionInput,
  LlmCompletionReason,
  LlmCompletionResult,
  LlmProvider,
  LlmProviderConfig,
} from "./types";

type FetchLike = typeof fetch;

interface ProviderRequest {
  url: string;
  init: RequestInit;
}

const API_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}(-preview)?$/;

const toProvider = (value: string): LlmProvider => (value.toLowerCase() === "azure" ? "azure" : "openai");

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const normalizeBaseUrl = (rawUrl: string): string => trimTrailingSlash(rawUrl.trim());

const fallbackResult = (
  provider: LlmProvider,
  input: LlmCompletionInput,
  reason: LlmCompletionReason,
  preflightErrors: string[],
  errorMessage?: string,
  rawResponse?: unknown,
): LlmCompletionResult => ({
  ok: false,
  usedFallback: true,
  reason,
  provider,
  text: input.fallbackOutput,
  preflightErrors,
  errorMessage,
  rawResponse,
});

const parseOpenAiResponseText = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const root = payload as Record<string, unknown>;

  if (typeof root.output_text === "string" && root.output_text.length > 0) {
    return root.output_text;
  }

  const output = root.output;
  if (Array.isArray(output)) {
    const textParts: string[] = [];
    for (const item of output) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const content = (item as Record<string, unknown>).content;
      if (!Array.isArray(content)) {
        continue;
      }
      for (const block of content) {
        if (!block || typeof block !== "object") {
          continue;
        }
        const text = (block as Record<string, unknown>).text;
        if (typeof text === "string" && text.length > 0) {
          textParts.push(text);
        }
      }
    }
    if (textParts.length > 0) {
      return textParts.join("\n").trim();
    }
  }

  return null;
};

const parseAzureResponseText = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const root = payload as Record<string, unknown>;
  const choices = root.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }
  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") {
    return null;
  }

  const message = (firstChoice as Record<string, unknown>).message;
  if (!message || typeof message !== "object") {
    return null;
  }

  const content = (message as Record<string, unknown>).content;
  if (typeof content === "string" && content.length > 0) {
    return content;
  }
  if (!Array.isArray(content)) {
    return null;
  }

  const textParts = content
    .map((part) => {
      if (!part || typeof part !== "object") {
        return null;
      }
      const text = (part as Record<string, unknown>).text;
      return typeof text === "string" ? text : null;
    })
    .filter((value): value is string => Boolean(value));

  return textParts.length > 0 ? textParts.join("\n").trim() : null;
};

const buildProviderRequest = (config: LlmProviderConfig, input: LlmCompletionInput): ProviderRequest => {
  if (config.provider === "openai") {
    const url = `${config.baseUrl}/responses`;
    const init: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        input: [
          ...(input.systemPrompt ? [{ role: "system", content: input.systemPrompt }] : []),
          { role: "user", content: input.userPrompt },
        ],
        temperature: input.temperature,
        ...(input.maxOutputTokens ? { max_output_tokens: input.maxOutputTokens } : {}),
      }),
    };
    return { url, init };
  }

  const deployment = config.azureDeployment as string;
  const url =
    `${config.baseUrl}/openai/deployments/${encodeURIComponent(deployment)}` +
    `/chat/completions?api-version=${encodeURIComponent(config.apiVersion)}`;
  const init: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": config.apiKey,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        ...(input.systemPrompt ? [{ role: "system", content: input.systemPrompt }] : []),
        { role: "user", content: input.userPrompt },
      ],
      temperature: input.temperature,
      ...(input.maxOutputTokens ? { max_tokens: input.maxOutputTokens } : {}),
    }),
  };
  return { url, init };
};

const parseResponseText = (provider: LlmProvider, payload: unknown): string | null =>
  provider === "openai" ? parseOpenAiResponseText(payload) : parseAzureResponseText(payload);

export const loadLlmProviderConfig = (store: RuntimeConfigStore): LlmProviderConfig => {
  const providerRaw = String(store.get<string>("LLM_PROVIDER") ?? "").trim().toLowerCase();
  const provider = toProvider(providerRaw);
  return {
    provider,
    providerRaw,
    baseUrl: normalizeBaseUrl(store.get<string>("LLM_BASE_URL")),
    apiKey: String(store.get<string>("LLM_API_KEY") ?? "").trim(),
    apiVersion: String(store.get<string>("LLM_API_VERSION") ?? "").trim(),
    model: String(store.get<string>("LLM_MODEL") ?? "").trim(),
    azureDeployment: String(store.get<string>("LLM_AZURE_DEPLOYMENT") ?? "").trim(),
  };
};

export const validateLlmProviderConfig = (config: LlmProviderConfig): string[] => {
  const errors: string[] = [];

  if (!["openai", "azure"].includes(config.providerRaw)) {
    errors.push('LLM_PROVIDER must be either "openai" or "azure".');
  }

  if (!config.apiKey) {
    errors.push("LLM_API_KEY is required.");
  }
  if (!config.model) {
    errors.push("LLM_MODEL is required.");
  }
  if (!config.apiVersion || !API_VERSION_PATTERN.test(config.apiVersion)) {
    errors.push("LLM_API_VERSION must match YYYY-MM-DD or YYYY-MM-DD-preview.");
  }

  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(config.baseUrl);
  } catch {
    errors.push("LLM_BASE_URL must be a valid URL.");
  }

  if (parsedUrl) {
    const host = parsedUrl.host.toLowerCase();
    if (config.provider === "openai") {
      const path = parsedUrl.pathname.toLowerCase();
      if (!host.includes("openai.com")) {
        errors.push("OpenAI provider requires an openai.com endpoint.");
      }
      if (!path.includes("/v1")) {
        errors.push("OpenAI provider requires a /v1 base path.");
      }
    } else {
      if (!host.endsWith(".openai.azure.com")) {
        errors.push("Azure provider requires endpoint host ending with .openai.azure.com.");
      }
      if (!config.azureDeployment) {
        errors.push("LLM_AZURE_DEPLOYMENT is required for Azure provider.");
      }
    }
  }

  if (config.provider === "azure" && config.azureDeployment === config.model) {
    errors.push("Azure deployment and model mapping must be explicit (different values).");
  }

  return errors;
};

export const completeWithLlmFallback = async (
  store: RuntimeConfigStore,
  input: LlmCompletionInput,
  fetchImpl: FetchLike = fetch,
): Promise<LlmCompletionResult> => {
  const providerConfig = loadLlmProviderConfig(store);
  const preflightErrors = validateLlmProviderConfig(providerConfig);
  if (preflightErrors.length > 0) {
    return fallbackResult(providerConfig.provider, input, "preflight_failed", preflightErrors);
  }

  const request = buildProviderRequest(providerConfig, input);

  let response: Response;
  try {
    response = await fetchImpl(request.url, request.init);
  } catch (error) {
    return fallbackResult(
      providerConfig.provider,
      input,
      "network_error",
      [],
      error instanceof Error ? error.message : String(error),
    );
  }

  if (!response.ok) {
    return fallbackResult(
      providerConfig.provider,
      input,
      "provider_error",
      [],
      `LLM provider returned status ${response.status}.`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    return fallbackResult(
      providerConfig.provider,
      input,
      "parse_error",
      [],
      error instanceof Error ? error.message : String(error),
    );
  }

  const parsedText = parseResponseText(providerConfig.provider, payload);
  if (!parsedText) {
    return fallbackResult(
      providerConfig.provider,
      input,
      "parse_error",
      [],
      "Could not extract assistant text from provider response.",
      payload,
    );
  }

  return {
    ok: true,
    usedFallback: false,
    reason: "success",
    provider: providerConfig.provider,
    text: parsedText,
    preflightErrors: [],
    rawResponse: payload,
  };
};
