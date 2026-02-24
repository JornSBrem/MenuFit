import type { ConfigDefinition } from "./types";

export const DEFAULT_CONFIG_DEFINITIONS = [
  {
    key: "APP_ENV",
    description: "Application environment name.",
    kind: "string",
    defaultValue: "development",
    meta: { hotReload: false, sensitive: false, restartRequired: true },
  },
  {
    key: "APP_PORT",
    description: "HTTP port for the backend API.",
    kind: "number",
    defaultValue: 3000,
    meta: { hotReload: false, sensitive: false, restartRequired: true },
  },
  {
    key: "LOG_LEVEL",
    description: "Structured logging level.",
    kind: "string",
    defaultValue: "info",
    meta: { hotReload: true, sensitive: false, restartRequired: false },
  },
  {
    key: "PG_LOGIN_URL",
    description: "Project Gezond login endpoint.",
    kind: "url",
    defaultValue: "https://backend.projectgezond.nl/api/login",
    meta: { hotReload: true, sensitive: false, restartRequired: false },
  },
  {
    key: "PG_WEEK_URL_TEMPLATE",
    description: "Project Gezond week endpoint template.",
    kind: "url",
    defaultValue: "https://backend.projectgezond.nl/api/v3/week-menus/{week}",
    meta: { hotReload: true, sensitive: false, restartRequired: false },
  },
  {
    key: "PG_DAY_URL_TEMPLATE",
    description: "Project Gezond day endpoint template.",
    kind: "url",
    defaultValue: "https://backend.projectgezond.nl/api/v3/daymenus/{dayId}",
    meta: { hotReload: true, sensitive: false, restartRequired: false },
  },
  {
    key: "PG_RECIPE_URL_TEMPLATE",
    description: "Project Gezond recipe endpoint template.",
    kind: "url",
    defaultValue: "https://backend.projectgezond.nl/api/v3/recipes/{recipeId}",
    meta: { hotReload: true, sensitive: false, restartRequired: false },
  },
  {
    key: "PG_SHOPPINGLIST_URL_TEMPLATE",
    description: "Project Gezond shopping list endpoint template.",
    kind: "url",
    defaultValue: "https://backend.projectgezond.nl/api/v3/week-menus/{week}",
    meta: { hotReload: true, sensitive: false, restartRequired: false },
  },
  {
    key: "PG_EXTRA_HEADERS_JSON",
    description: "Extra headers for Project Gezond API calls.",
    kind: "json",
    defaultValue: { "X-Requested-With": "XMLHttpRequest" },
    meta: { hotReload: true, sensitive: false, restartRequired: false },
  },
  {
    key: "LLM_PROVIDER",
    description: "Configured LLM provider profile.",
    kind: "string",
    defaultValue: "openai",
    meta: { hotReload: true, sensitive: false, restartRequired: false },
  },
  {
    key: "LLM_BASE_URL",
    description: "Base URL for the active LLM provider.",
    kind: "url",
    defaultValue: "https://api.openai.com/v1",
    meta: { hotReload: true, sensitive: false, restartRequired: false },
  },
  {
    key: "LLM_MODEL",
    description: "Model identifier used for LLM completion requests.",
    kind: "string",
    defaultValue: "gpt-4o-mini",
    meta: { hotReload: true, sensitive: false, restartRequired: false },
  },
  {
    key: "LLM_AZURE_DEPLOYMENT",
    description: "Azure OpenAI deployment name mapped to the configured model.",
    kind: "string",
    defaultValue: "",
    meta: { hotReload: true, sensitive: false, restartRequired: false },
  },
  {
    key: "LLM_API_KEY",
    description: "Secret key for the active LLM provider.",
    kind: "string",
    defaultValue: "",
    meta: { hotReload: true, sensitive: true, restartRequired: false },
  },
  {
    key: "LLM_API_VERSION",
    description: "Provider API version for compatibility checks.",
    kind: "string",
    defaultValue: "2024-10-21",
    meta: { hotReload: true, sensitive: false, restartRequired: false },
  },
  {
    key: "FEATURE_FLAGS_JSON",
    description: "Feature flags as JSON object.",
    kind: "json",
    defaultValue: {},
    meta: { hotReload: true, sensitive: false, restartRequired: false },
  },
] as const satisfies readonly ConfigDefinition[];

export type DefaultConfigDefinition = (typeof DEFAULT_CONFIG_DEFINITIONS)[number];
export type DefaultConfigKey = DefaultConfigDefinition["key"];
