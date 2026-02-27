import type { RuntimeConfigStore } from "../../../shared/config";
import type { BronzeEntityType } from "../../domain/storage/medallion-schema";
import {
  buildPgEndpointUrl,
  PG_ENDPOINT_BY_ENTITY_TYPE,
  type PgEndpointVariables,
} from "../../integrations/pg/endpoint-contract.ts";
import type { IngestMatrixRequest, IngestTask } from "./types";

const DEFAULT_ENTITY_TYPES: BronzeEntityType[] = [
  "pg.week_menu",
  "pg.shopping_list_pdf",
];

const sortAscending = (values: number[]) => [...values].sort((a, b) => a - b);

const uniqueNumbers = (values: number[]) => Array.from(new Set(values));

const endpointVariablesByEntityType = (
  entityType: BronzeEntityType,
  week: number,
): PgEndpointVariables => {
  if (entityType === "pg.day_menu") {
    return { dayId: week };
  }
  if (entityType === "pg.recipe") {
    return { recipeId: `week-${week}` };
  }
  // PG API verwacht alleen het weeknummer (bijv. 9), niet YYYYWW (bijv. 202609)
  return { week: week % 100 };
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
  const basePersonsList = sortAscending(uniqueNumbers(matrix.basePersons));
  const entityTypes = options?.entityTypes ?? DEFAULT_ENTITY_TYPES;

  for (const week of weeks) {
    for (const basePersons of basePersonsList) {
      for (const entityType of entityTypes) {
        const endpoint = PG_ENDPOINT_BY_ENTITY_TYPE[entityType];
        if (!endpoint) {
          continue;
        }

        const requestUrl = buildPgEndpointUrl(
          config,
          endpoint,
          endpointVariablesByEntityType(entityType, week),
        );

        tasks.push({
          source: "pg",
          entityType,
          week,
          basePersons,
          requestUrl,
        });
      }
    }
  }

  return tasks;
};
