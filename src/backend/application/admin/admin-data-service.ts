import type { AuditTrailService } from "../audit/audit-trail-service.ts";
import type { AdminOperationReport } from "./types.ts";

export type RecipeVisibility = "private" | "household" | "shared";

export interface RecipeRecord {
  recipeId: string;
  slug: string;
  title: string;
  visibility: RecipeVisibility;
  prepMinutes?: number;
  tags: string[];
  updatedAt: string;
  updatedBy: string;
}

export interface WeekMenuRecord {
  weekMenuId: string;
  householdId: string;
  week: number;
  kcal: number;
  basePersons: number;
  mealCount: number;
  updatedAt: string;
  updatedBy: string;
}

export interface MappingOverrideRecord {
  overrideId: string;
  sourceKey: string;
  targetKey: string;
  note?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface UpsertRecipeInput {
  operationId: string;
  performedBy: string;
  recipe: {
    recipeId: string;
    slug: string;
    title: string;
    visibility: RecipeVisibility;
    prepMinutes?: number;
    tags: string[];
  };
}

export interface DeleteRecipeInput {
  operationId: string;
  performedBy: string;
  recipeId: string;
}

export interface UpsertWeekMenuInput {
  operationId: string;
  performedBy: string;
  weekMenu: {
    weekMenuId: string;
    householdId: string;
    week: number;
    kcal: number;
    basePersons: number;
    mealCount: number;
  };
}

export interface DeleteWeekMenuInput {
  operationId: string;
  performedBy: string;
  weekMenuId: string;
}

export interface UpsertMappingOverrideInput {
  operationId: string;
  performedBy: string;
  override: {
    overrideId: string;
    sourceKey: string;
    targetKey: string;
    note?: string;
  };
}

export interface DeleteMappingOverrideInput {
  operationId: string;
  performedBy: string;
  overrideId: string;
}

export class AdminDataValidationError extends Error {
  readonly code: string;

  readonly hint?: string;

  constructor(code: string, message: string, hint?: string) {
    super(message);
    this.name = "AdminDataValidationError";
    this.code = code;
    this.hint = hint;
  }
}

export interface AdminDataServiceOptions {
  now?: () => string;
  auditTrail?: AuditTrailService;
}

const VALID_VISIBILITIES: RecipeVisibility[] = ["private", "household", "shared"];

const makeReport = (
  operationId: string,
  operationType: string,
  performedBy: string,
  sequence: number,
  now: string,
  details?: Record<string, unknown>,
): AdminOperationReport => ({
  reportId: `data-op-${sequence}`,
  operationId,
  operationType: operationType as AdminOperationReport["operationType"],
  status: "completed",
  dryRun: false,
  message: `${operationType} completed.`,
  createdAt: now,
  performedBy,
  details,
});

export class AdminDataService {
  private readonly recipes = new Map<string, RecipeRecord>();

  private readonly weekMenus = new Map<string, WeekMenuRecord>();

  private readonly mappingOverrides = new Map<string, MappingOverrideRecord>();

  private sequence = 0;

  private readonly now: () => string;

  private readonly auditTrail?: AuditTrailService;

  constructor(options?: AdminDataServiceOptions) {
    this.now = options?.now ?? (() => new Date().toISOString());
    this.auditTrail = options?.auditTrail;
  }

  // --- Recipes ---

  listRecipes(): RecipeRecord[] {
    return Array.from(this.recipes.values())
      .map((r) => ({ ...r }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  upsertRecipe(input: UpsertRecipeInput): AdminOperationReport {
    this.validateRecipe(input.recipe);
    const now = this.now();
    const record: RecipeRecord = {
      ...input.recipe,
      tags: [...input.recipe.tags],
      updatedAt: now,
      updatedBy: input.performedBy,
    };
    this.recipes.set(record.recipeId, record);
    this.audit("recipe_upsert", input.operationId, input.performedBy, { recipeId: record.recipeId });
    return makeReport(input.operationId, "recipe_upsert", input.performedBy, ++this.sequence, now, {
      recipeId: record.recipeId,
    });
  }

  deleteRecipe(input: DeleteRecipeInput): AdminOperationReport {
    if (!input.recipeId?.trim()) {
      throw new AdminDataValidationError("INVALID_INPUT", "recipeId is required");
    }
    const now = this.now();
    this.recipes.delete(input.recipeId);
    this.audit("recipe_delete", input.operationId, input.performedBy, { recipeId: input.recipeId });
    return makeReport(input.operationId, "recipe_delete", input.performedBy, ++this.sequence, now, {
      recipeId: input.recipeId,
    });
  }

  // --- WeekMenus ---

  listWeekMenus(): WeekMenuRecord[] {
    return Array.from(this.weekMenus.values())
      .map((w) => ({ ...w }))
      .sort((a, b) => a.week - b.week || a.householdId.localeCompare(b.householdId));
  }

  upsertWeekMenu(input: UpsertWeekMenuInput): AdminOperationReport {
    this.validateWeekMenu(input.weekMenu);
    const now = this.now();
    const record: WeekMenuRecord = {
      ...input.weekMenu,
      updatedAt: now,
      updatedBy: input.performedBy,
    };
    this.weekMenus.set(record.weekMenuId, record);
    this.audit("weekmenu_upsert", input.operationId, input.performedBy, { weekMenuId: record.weekMenuId });
    return makeReport(input.operationId, "weekmenu_upsert", input.performedBy, ++this.sequence, now, {
      weekMenuId: record.weekMenuId,
    });
  }

  deleteWeekMenu(input: DeleteWeekMenuInput): AdminOperationReport {
    if (!input.weekMenuId?.trim()) {
      throw new AdminDataValidationError("INVALID_INPUT", "weekMenuId is required");
    }
    const now = this.now();
    this.weekMenus.delete(input.weekMenuId);
    this.audit("weekmenu_delete", input.operationId, input.performedBy, { weekMenuId: input.weekMenuId });
    return makeReport(input.operationId, "weekmenu_delete", input.performedBy, ++this.sequence, now, {
      weekMenuId: input.weekMenuId,
    });
  }

  // --- Mapping Overrides ---

  listMappingOverrides(): MappingOverrideRecord[] {
    return Array.from(this.mappingOverrides.values())
      .map((m) => ({ ...m }))
      .sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));
  }

  upsertMappingOverride(input: UpsertMappingOverrideInput): AdminOperationReport {
    this.validateMappingOverride(input.override);
    const now = this.now();
    const record: MappingOverrideRecord = {
      ...input.override,
      updatedAt: now,
      updatedBy: input.performedBy,
    };
    this.mappingOverrides.set(record.overrideId, record);
    this.audit("mapping_upsert", input.operationId, input.performedBy, { overrideId: record.overrideId });
    return makeReport(input.operationId, "mapping_upsert", input.performedBy, ++this.sequence, now, {
      overrideId: record.overrideId,
    });
  }

  deleteMappingOverride(input: DeleteMappingOverrideInput): AdminOperationReport {
    if (!input.overrideId?.trim()) {
      throw new AdminDataValidationError("INVALID_INPUT", "overrideId is required");
    }
    const now = this.now();
    this.mappingOverrides.delete(input.overrideId);
    this.audit("mapping_delete", input.operationId, input.performedBy, { overrideId: input.overrideId });
    return makeReport(input.operationId, "mapping_delete", input.performedBy, ++this.sequence, now, {
      overrideId: input.overrideId,
    });
  }

  private validateRecipe(recipe: UpsertRecipeInput["recipe"]): void {
    if (!recipe.recipeId?.trim()) {
      throw new AdminDataValidationError("INVALID_INPUT", "recipeId is required");
    }
    if (!recipe.slug?.trim()) {
      throw new AdminDataValidationError("INVALID_INPUT", "slug is required");
    }
    if (!recipe.title?.trim()) {
      throw new AdminDataValidationError("INVALID_INPUT", "title is required");
    }
    if (!VALID_VISIBILITIES.includes(recipe.visibility)) {
      throw new AdminDataValidationError(
        "INVALID_INPUT",
        "visibility must be private, household, or shared",
      );
    }
    if (
      recipe.prepMinutes !== undefined &&
      (!Number.isInteger(recipe.prepMinutes) || recipe.prepMinutes < 0)
    ) {
      throw new AdminDataValidationError(
        "INVALID_INPUT",
        "prepMinutes must be a non-negative integer",
      );
    }
    if (!Array.isArray(recipe.tags)) {
      throw new AdminDataValidationError("INVALID_INPUT", "tags must be an array");
    }
  }

  private validateWeekMenu(weekMenu: UpsertWeekMenuInput["weekMenu"]): void {
    if (!weekMenu.weekMenuId?.trim()) {
      throw new AdminDataValidationError("INVALID_INPUT", "weekMenuId is required");
    }
    if (!weekMenu.householdId?.trim()) {
      throw new AdminDataValidationError("INVALID_INPUT", "householdId is required");
    }
    if (!Number.isInteger(weekMenu.week) || weekMenu.week < 1 || weekMenu.week > 53) {
      throw new AdminDataValidationError("INVALID_INPUT", "week must be between 1 and 53");
    }
    if (!Number.isInteger(weekMenu.kcal) || weekMenu.kcal <= 0) {
      throw new AdminDataValidationError("INVALID_INPUT", "kcal must be a positive integer");
    }
    if (!Number.isInteger(weekMenu.basePersons) || weekMenu.basePersons <= 0) {
      throw new AdminDataValidationError("INVALID_INPUT", "basePersons must be a positive integer");
    }
    if (!Number.isInteger(weekMenu.mealCount) || weekMenu.mealCount < 0) {
      throw new AdminDataValidationError("INVALID_INPUT", "mealCount must be a non-negative integer");
    }
  }

  private validateMappingOverride(override: UpsertMappingOverrideInput["override"]): void {
    if (!override.overrideId?.trim()) {
      throw new AdminDataValidationError("INVALID_INPUT", "overrideId is required");
    }
    if (!override.sourceKey?.trim()) {
      throw new AdminDataValidationError("INVALID_INPUT", "sourceKey is required");
    }
    if (!override.targetKey?.trim()) {
      throw new AdminDataValidationError("INVALID_INPUT", "targetKey is required");
    }
  }

  private audit(
    action: string,
    operationId: string,
    actorId: string,
    details?: Record<string, unknown>,
  ): void {
    this.auditTrail?.record({
      category: "admin",
      action,
      resourceId: operationId,
      actorId,
      outcome: "success",
      details,
    });
  }
}
