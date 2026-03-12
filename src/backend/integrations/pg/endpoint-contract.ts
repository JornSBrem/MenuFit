import type { RuntimeConfigStore } from "../../../shared/config";
import type { BronzeEntityType } from "../../domain/storage/medallion-schema";

export const PG_ENDPOINT_KEYS = {
  login: "PG_LOGIN_URL",
  week: "PG_WEEK_URL_TEMPLATE",
  day: "PG_DAY_URL_TEMPLATE",
  recipe: "PG_RECIPE_URL_TEMPLATE",
  shoppingList: "PG_SHOPPINGLIST_URL_TEMPLATE",
} as const;

export type PgEndpointName = keyof typeof PG_ENDPOINT_KEYS;
export type PgEndpointKey = (typeof PG_ENDPOINT_KEYS)[PgEndpointName];

export const PG_ENDPOINT_DEFAULTS = {
  PG_LOGIN_URL: "https://backend.projectgezond.nl/api/login",
  PG_WEEK_URL_TEMPLATE: "https://backend.projectgezond.nl/api/week-menu/{week}",
  PG_DAY_URL_TEMPLATE: "https://backend.projectgezond.nl/api/v3/daymenus/{dayId}",
  PG_RECIPE_URL_TEMPLATE: "https://backend.projectgezond.nl/api/recipe/{recipeId}",
  PG_SHOPPINGLIST_URL_TEMPLATE: "https://backend.projectgezond.nl/api/week-menu/{week}",
} as const satisfies Record<PgEndpointKey, string>;

export type PgEndpointTemplateVariable = "week" | "dayId" | "recipeId";
export type PgEndpointVariables = Partial<Record<PgEndpointTemplateVariable, string | number>>;

export const PG_ENDPOINT_REQUIRED_PARAMS = {
  login: [],
  week: ["week"],
  day: ["dayId"],
  recipe: ["recipeId"],
  shoppingList: ["week"],
} as const satisfies Record<PgEndpointName, readonly PgEndpointTemplateVariable[]>;

export const PG_ENDPOINT_BY_ENTITY_TYPE: Record<BronzeEntityType, PgEndpointName | null> = {
  "pg.week_menu": "week",
  "pg.day_menu": "day",
  "pg.recipe": "recipe",
  "pg.shopping_list_pdf": "shoppingList",
  "picnic.search_result": null,
  "picnic.product_detail": null,
};

const PLACEHOLDER_PATTERN = /\{([a-zA-Z0-9_]+)\}/g;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasTemplateValue = (value: unknown): value is string | number => {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value === "string") {
    return value.length > 0;
  }
  return false;
};

const listTemplatePlaceholders = (template: string): string[] => {
  const placeholders: string[] = [];
  for (const match of template.matchAll(PLACEHOLDER_PATTERN)) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1]);
    }
  }
  return placeholders;
};

const assertRequiredVariables = (
  endpoint: PgEndpointName,
  variables: PgEndpointVariables,
): void => {
  const required = PG_ENDPOINT_REQUIRED_PARAMS[endpoint];
  for (const key of required) {
    if (!hasTemplateValue(variables[key])) {
      throw new Error(`Missing required template variable "${key}" for PG endpoint "${endpoint}"`);
    }
  }
};

const assertDataObject = (
  endpoint: PgEndpointName,
  payload: unknown,
): Record<string, unknown> => {
  if (!isRecord(payload)) {
    throw new Error(`Invalid PG ${endpoint} response: expected object`);
  }

  const data = payload.data;
  if (!isRecord(data)) {
    throw new Error(`Invalid PG ${endpoint} response: expected data object`);
  }

  return data;
};

export interface PgEndpointContractEntry {
  endpoint: PgEndpointName;
  key: PgEndpointKey;
  defaultTemplate: string;
  configuredTemplate: string;
  requiredParameters: readonly PgEndpointTemplateVariable[];
}

export const getPgEndpointConfigKey = (endpoint: PgEndpointName): PgEndpointKey =>
  PG_ENDPOINT_KEYS[endpoint];

export const getPgEndpointTemplate = (
  config: RuntimeConfigStore,
  endpoint: PgEndpointName,
): string => {
  const key = getPgEndpointConfigKey(endpoint);
  const configured = config.get<string>(key);
  if (typeof configured !== "string" || configured.length === 0) {
    return PG_ENDPOINT_DEFAULTS[key];
  }
  return configured;
};

export const renderPgEndpointTemplate = (
  endpoint: PgEndpointName,
  template: string,
  variables: PgEndpointVariables = {},
): string => {
  assertRequiredVariables(endpoint, variables);

  let rendered = template;
  const placeholders = listTemplatePlaceholders(template);
  for (const placeholder of placeholders) {
    const replacement = variables[placeholder as PgEndpointTemplateVariable];
    if (!hasTemplateValue(replacement)) {
      throw new Error(`Missing template variable "${placeholder}" for PG endpoint "${endpoint}"`);
    }
    rendered = rendered.replaceAll(`{${placeholder}}`, encodeURIComponent(String(replacement)));
  }

  if (listTemplatePlaceholders(rendered).length > 0) {
    throw new Error(`Unresolved template placeholders for PG endpoint "${endpoint}": ${rendered}`);
  }

  return rendered;
};

export const buildPgEndpointUrl = (
  config: RuntimeConfigStore,
  endpoint: PgEndpointName,
  variables: PgEndpointVariables = {},
): string => {
  const template = getPgEndpointTemplate(config, endpoint);
  return renderPgEndpointTemplate(endpoint, template, variables);
};

export const getPgEndpointContract = (
  config: RuntimeConfigStore,
): PgEndpointContractEntry[] =>
  (Object.keys(PG_ENDPOINT_KEYS) as PgEndpointName[]).map((endpoint) => {
    const key = getPgEndpointConfigKey(endpoint);
    return {
      endpoint,
      key,
      defaultTemplate: PG_ENDPOINT_DEFAULTS[key],
      configuredTemplate: getPgEndpointTemplate(config, endpoint),
      requiredParameters: PG_ENDPOINT_REQUIRED_PARAMS[endpoint],
    };
  });

export const assertPgResponseShape = (
  endpoint: PgEndpointName,
  payload: unknown,
): void => {
  switch (endpoint) {
    case "login":
      if (!isRecord(payload)) {
        throw new Error("Invalid PG login response: expected object");
      }
      return;
    case "week":
    case "shoppingList": {
      const data = assertDataObject(endpoint, payload);
      if (!isRecord(data.groceries) && !Array.isArray(data.groceries)) {
        throw new Error(`Invalid PG ${endpoint} response: expected data.groceries object or array`);
      }
      return;
    }
    case "day":
    case "recipe":
      assertDataObject(endpoint, payload);
      return;
    default:
      throw new Error(`Unknown PG endpoint: ${String(endpoint as never)}`);
  }
};

export const isPgResponseShape = (
  endpoint: PgEndpointName,
  payload: unknown,
): boolean => {
  try {
    assertPgResponseShape(endpoint, payload);
    return true;
  } catch {
    return false;
  }
};
