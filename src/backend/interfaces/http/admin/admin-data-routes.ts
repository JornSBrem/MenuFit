import {
  AdminDataService,
  AdminDataValidationError,
  type MappingOverrideRecord,
  type RecipeRecord,
  type WeekMenuRecord,
} from "../../../application/admin/admin-data-service.ts";
import type { AdminOperationReport } from "../../../application/admin/types.ts";
import type { AnySessionContext } from "../auth/session-context.ts";
import { requireAdminSession, SessionContextError } from "../auth/session-context.ts";

export interface DataApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; hint?: string };
}

const forbidden = (error: SessionContextError): DataApiEnvelope<never> => ({
  ok: false,
  error: { code: error.code, message: error.message, hint: error.hint },
});

const validationError = (error: AdminDataValidationError): DataApiEnvelope<never> => ({
  ok: false,
  error: { code: error.code, message: error.message, hint: error.hint },
});

const withAdminSession = (session: AnySessionContext) => {
  try {
    return { ok: true as const, admin: requireAdminSession(session) };
  } catch (error) {
    if (error instanceof SessionContextError) {
      return { ok: false as const, envelope: forbidden(error) };
    }
    return {
      ok: false as const,
      envelope: {
        ok: false as const,
        error: { code: "FORBIDDEN_SESSION", message: "Route requires admin session" },
      },
    };
  }
};

// --- Recipe route handlers ---

export const handleListRecipes = (
  service: AdminDataService,
  session: AnySessionContext,
): DataApiEnvelope<RecipeRecord[]> => {
  const auth = withAdminSession(session);
  if (!auth.ok) return auth.envelope;

  return { ok: true, data: service.listRecipes() };
};

export interface UpsertRecipeBody {
  operationId: string;
  recipe: {
    recipeId: string;
    slug: string;
    title: string;
    visibility: "private" | "household" | "shared";
    prepMinutes?: number;
    tags: string[];
  };
}

export const handleUpsertRecipe = (
  service: AdminDataService,
  session: AnySessionContext,
  body: UpsertRecipeBody,
): DataApiEnvelope<AdminOperationReport> => {
  const auth = withAdminSession(session);
  if (!auth.ok) return auth.envelope;

  if (!body.operationId?.trim()) {
    return { ok: false, error: { code: "INVALID_BODY", message: "operationId is required" } };
  }

  try {
    const report = service.upsertRecipe({
      operationId: body.operationId,
      performedBy: auth.admin.subjectId,
      recipe: body.recipe,
    });
    return { ok: true, data: report };
  } catch (error) {
    if (error instanceof AdminDataValidationError) return validationError(error);
    return { ok: false, error: { code: "INTERNAL_ERROR", message: "upsertRecipe failed" } };
  }
};

export interface DeleteRecipeBody {
  operationId: string;
  recipeId: string;
}

export const handleDeleteRecipe = (
  service: AdminDataService,
  session: AnySessionContext,
  body: DeleteRecipeBody,
): DataApiEnvelope<AdminOperationReport> => {
  const auth = withAdminSession(session);
  if (!auth.ok) return auth.envelope;

  if (!body.operationId?.trim()) {
    return { ok: false, error: { code: "INVALID_BODY", message: "operationId is required" } };
  }
  if (!body.recipeId?.trim()) {
    return { ok: false, error: { code: "INVALID_BODY", message: "recipeId is required" } };
  }

  try {
    const report = service.deleteRecipe({
      operationId: body.operationId,
      performedBy: auth.admin.subjectId,
      recipeId: body.recipeId,
    });
    return { ok: true, data: report };
  } catch (error) {
    if (error instanceof AdminDataValidationError) return validationError(error);
    return { ok: false, error: { code: "INTERNAL_ERROR", message: "deleteRecipe failed" } };
  }
};

// --- WeekMenu route handlers ---

export const handleListWeekMenus = (
  service: AdminDataService,
  session: AnySessionContext,
): DataApiEnvelope<WeekMenuRecord[]> => {
  const auth = withAdminSession(session);
  if (!auth.ok) return auth.envelope;

  return { ok: true, data: service.listWeekMenus() };
};

export interface UpsertWeekMenuBody {
  operationId: string;
  weekMenu: {
    weekMenuId: string;
    householdId: string;
    week: number;
    kcal: number;
    basePersons: number;
    mealCount: number;
  };
}

export const handleUpsertWeekMenu = (
  service: AdminDataService,
  session: AnySessionContext,
  body: UpsertWeekMenuBody,
): DataApiEnvelope<AdminOperationReport> => {
  const auth = withAdminSession(session);
  if (!auth.ok) return auth.envelope;

  if (!body.operationId?.trim()) {
    return { ok: false, error: { code: "INVALID_BODY", message: "operationId is required" } };
  }

  try {
    const report = service.upsertWeekMenu({
      operationId: body.operationId,
      performedBy: auth.admin.subjectId,
      weekMenu: body.weekMenu,
    });
    return { ok: true, data: report };
  } catch (error) {
    if (error instanceof AdminDataValidationError) return validationError(error);
    return { ok: false, error: { code: "INTERNAL_ERROR", message: "upsertWeekMenu failed" } };
  }
};

export interface DeleteWeekMenuBody {
  operationId: string;
  weekMenuId: string;
}

export const handleDeleteWeekMenu = (
  service: AdminDataService,
  session: AnySessionContext,
  body: DeleteWeekMenuBody,
): DataApiEnvelope<AdminOperationReport> => {
  const auth = withAdminSession(session);
  if (!auth.ok) return auth.envelope;

  if (!body.operationId?.trim()) {
    return { ok: false, error: { code: "INVALID_BODY", message: "operationId is required" } };
  }
  if (!body.weekMenuId?.trim()) {
    return { ok: false, error: { code: "INVALID_BODY", message: "weekMenuId is required" } };
  }

  try {
    const report = service.deleteWeekMenu({
      operationId: body.operationId,
      performedBy: auth.admin.subjectId,
      weekMenuId: body.weekMenuId,
    });
    return { ok: true, data: report };
  } catch (error) {
    if (error instanceof AdminDataValidationError) return validationError(error);
    return { ok: false, error: { code: "INTERNAL_ERROR", message: "deleteWeekMenu failed" } };
  }
};

// --- Mapping Override route handlers ---

export const handleListMappingOverrides = (
  service: AdminDataService,
  session: AnySessionContext,
): DataApiEnvelope<MappingOverrideRecord[]> => {
  const auth = withAdminSession(session);
  if (!auth.ok) return auth.envelope;

  return { ok: true, data: service.listMappingOverrides() };
};

export interface UpsertMappingOverrideBody {
  operationId: string;
  override: {
    overrideId: string;
    sourceKey: string;
    targetKey: string;
    note?: string;
  };
}

export const handleUpsertMappingOverride = (
  service: AdminDataService,
  session: AnySessionContext,
  body: UpsertMappingOverrideBody,
): DataApiEnvelope<AdminOperationReport> => {
  const auth = withAdminSession(session);
  if (!auth.ok) return auth.envelope;

  if (!body.operationId?.trim()) {
    return { ok: false, error: { code: "INVALID_BODY", message: "operationId is required" } };
  }

  try {
    const report = service.upsertMappingOverride({
      operationId: body.operationId,
      performedBy: auth.admin.subjectId,
      override: body.override,
    });
    return { ok: true, data: report };
  } catch (error) {
    if (error instanceof AdminDataValidationError) return validationError(error);
    return { ok: false, error: { code: "INTERNAL_ERROR", message: "upsertMappingOverride failed" } };
  }
};

export interface DeleteMappingOverrideBody {
  operationId: string;
  overrideId: string;
}

export const handleDeleteMappingOverride = (
  service: AdminDataService,
  session: AnySessionContext,
  body: DeleteMappingOverrideBody,
): DataApiEnvelope<AdminOperationReport> => {
  const auth = withAdminSession(session);
  if (!auth.ok) return auth.envelope;

  if (!body.operationId?.trim()) {
    return { ok: false, error: { code: "INVALID_BODY", message: "operationId is required" } };
  }
  if (!body.overrideId?.trim()) {
    return { ok: false, error: { code: "INVALID_BODY", message: "overrideId is required" } };
  }

  try {
    const report = service.deleteMappingOverride({
      operationId: body.operationId,
      performedBy: auth.admin.subjectId,
      overrideId: body.overrideId,
    });
    return { ok: true, data: report };
  } catch (error) {
    if (error instanceof AdminDataValidationError) return validationError(error);
    return { ok: false, error: { code: "INTERNAL_ERROR", message: "deleteMappingOverride failed" } };
  }
};
