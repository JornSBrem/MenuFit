import type { GoldWeekReadService, WeekGroceriesResponse, WeekSummaryResponse } from "../../../application/gold";

export interface WeekQuery {
  year: number;
  week: number;
  kcal: number;
  basePersons: number;
}

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    hint?: string;
  };
}

const invalidQuery = (hint: string): ApiEnvelope<never> => ({
  ok: false,
  error: {
    code: "INVALID_QUERY",
    message: "Query is invalid.",
    hint,
  },
});

const notFound = (resource: string): ApiEnvelope<never> => ({
  ok: false,
  error: {
    code: "NOT_FOUND",
    message: `${resource} not found.`,
    hint: "Ensure the week has been ingested and projected to gold.",
  },
});

const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0;

const validateWeekQuery = (query: WeekQuery): string | null => {
  if (!isPositiveInteger(query.year)) {
    return "year must be a positive integer";
  }
  if (!isPositiveInteger(query.week) || query.week > 53) {
    return "week must be an integer between 1 and 53";
  }
  if (!isPositiveInteger(query.kcal)) {
    return "kcal must be a positive integer";
  }
  if (!isPositiveInteger(query.basePersons)) {
    return "basePersons must be a positive integer";
  }
  return null;
};

export const handleWeekSummary = (
  service: GoldWeekReadService,
  query: WeekQuery,
): ApiEnvelope<WeekSummaryResponse> => {
  const validationError = validateWeekQuery(query);
  if (validationError) {
    return invalidQuery(validationError);
  }

  const summary = service.getSummary(query.year, query.week, query.kcal, query.basePersons);
  if (!summary) {
    return notFound("Week summary");
  }

  return { ok: true, data: summary };
};

export const handleWeekGroceries = (
  service: GoldWeekReadService,
  query: WeekQuery,
): ApiEnvelope<WeekGroceriesResponse> => {
  const validationError = validateWeekQuery(query);
  if (validationError) {
    return invalidQuery(validationError);
  }

  const groceries = service.getGroceries(query.year, query.week, query.kcal, query.basePersons);
  if (!groceries) {
    return notFound("Week groceries");
  }

  return { ok: true, data: groceries };
};

export interface WeekRouteHandlers {
  summary: (query: WeekQuery) => ApiEnvelope<WeekSummaryResponse>;
  groceries: (query: WeekQuery) => ApiEnvelope<WeekGroceriesResponse>;
}

export const createWeekRouteHandlers = (service: GoldWeekReadService): WeekRouteHandlers => ({
  summary: (query) => handleWeekSummary(service, query),
  groceries: (query) => handleWeekGroceries(service, query),
});
