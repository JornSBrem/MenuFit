import { nlAdminResources, type AdminI18nKey } from "./resources/nl.ts";

export type AdminLocale = "nl";

const resourcesByLocale: Record<AdminLocale, Record<AdminI18nKey, string>> = {
  nl: nlAdminResources,
};

const replaceTemplateTokens = (
  template: string,
  values?: Record<string, string | number>,
): string => {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_match, key) => {
    const value = values[key];
    return value === undefined ? `{${key}}` : String(value);
  });
};

export const translateAdmin = (
  key: AdminI18nKey,
  options?: {
    locale?: AdminLocale;
    values?: Record<string, string | number>;
  },
): string => {
  const locale = options?.locale ?? "nl";
  const template = resourcesByLocale[locale][key] ?? resourcesByLocale.nl[key] ?? key;
  return replaceTemplateTokens(template, options?.values);
};

export type { AdminI18nKey };
