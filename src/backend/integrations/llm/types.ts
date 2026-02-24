export type LlmProvider = "openai" | "azure";

export interface LlmProviderConfig {
  provider: LlmProvider;
  providerRaw: string;
  baseUrl: string;
  apiKey: string;
  apiVersion: string;
  model: string;
  azureDeployment?: string;
}

export interface LlmCompletionInput {
  userPrompt: string;
  systemPrompt?: string;
  fallbackOutput: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export type LlmCompletionReason =
  | "success"
  | "preflight_failed"
  | "network_error"
  | "provider_error"
  | "parse_error";

export interface LlmCompletionResult {
  ok: boolean;
  usedFallback: boolean;
  reason: LlmCompletionReason;
  provider: LlmProvider;
  text: string;
  preflightErrors: string[];
  errorMessage?: string;
  rawResponse?: unknown;
}
