import type { RuntimeConfigStore } from "../../../shared/config";
import type { BronzeEntityType } from "../../domain/storage/medallion-schema";
import type { IngestMatrixRequest, IngestTask } from "./types";

const DEFAULT_ENTITY_TYPES: BronzeEntityType[] = [
  "pg.week_menu",
  "pg.shopping_list_pdf",
];

const sortAscending = (values: number[]) => [...values].sort((a, b) => a - b);

const uniqueNumbers = (values: number[]) => Array.from(new Set(values));

const replaceTemplate = (template: string, variables: Record<string, string | number>): string => {
  let value = template;
  for (const [key, replacement] of Object.entries(variables)) {
    value = value.replace(`{${key}}`, String(replacement));
  }
  return value;
};

const endpointKeyByEntityType: Record<BronzeEntityType, string | null> = {
  "pg.week_menu": "PG_WEEK_URL_TEMPLATE",
  "pg.day_menu": "PG_DAY_URL_TEMPLATE",
  "pg.recipe": "PG_RECIPE_URL_TEMPLATE",
  "pg.shopping_list_pdf": "PG_SHOPPINGLIST_URL_TEMPLATE",
  "picnic.search_result": null,
  "picnic.product_detail": null,
};

export interface PlannerOptions {
  entityTypes?: BronzeEntityType[];
}

export const createIngestPlan = (
  matrix: IngestMatrixRequest,
  config: RuntimeConfigStore,
  options?: PlannerOptions,
): IngestTask[] => {
  const tasks: IngestTask[] = [];
  const weeks = sortAscending(uniqueNumbers(matrix.weeks));
  const kcals = sortAscending(uniqueNumbers(matrix.kcals));
  const basePersonsList = sortAscending(uniqueNumbers(matrix.basePersons));
  const entityTypes = options?.entityTypes ?? DEFAULT_ENTITY_TYPES;

  for (const week of weeks) {
    for (const kcal of kcals) {
      for (const basePersons of basePersonsList) {
        for (const entityType of entityTypes) {
          const endpointKey = endpointKeyByEntityType[entityType];
          if (!endpointKey) {
            continue;
          }

          const template = config.get<string>(endpointKey);
          const requestUrl = replaceTemplate(template, {
            week,
            dayId: week,
            recipeId: `week-${week}`,
          });

          tasks.push({
            source: "pg",
            entityType,
            week,
            kcal,
            basePersons,
            requestUrl,
          });
        }
      }
    }
  }

  return tasks;
};
