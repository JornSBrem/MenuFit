export type QualitySeverity = "info" | "warning" | "error";

export type ReconcileStatus =
  | "matched"
  | "partial"
  | "missing_in_pdf"
  | "missing_in_computed";

export interface TransformContext {
  sourceObjectId: string;
  year: number;
  week: number;
  kcal: number;
  basePersons: number;
  transformVersion: string;
  canonicalRulesetVersion: string;
  synonymDictVersion: string;
}

export interface SilverWeekRow {
  weekId: string;
  year: number;
  week: number;
  kcal: number;
  basePersons: number;
  sourceObjectId: string;
  transformVersion: string;
}

export interface SilverMealRow {
  mealId: string;
  weekId: string;
  dayLabel: string;
  mealLabel: string;
  recipeId?: string;
  sourceObjectId: string;
  transformVersion: string;
}

export interface SilverIngredientRawRow {
  rawId: string;
  mealId: string;
  ingredientText: string;
  rawUnit?: string;
  rawAmount?: string;
  sourceObjectId: string;
  transformVersion: string;
}

export interface SilverIngredientCanonicalRow {
  canonicalId: string;
  rawId: string;
  canonicalName: string;
  canonicalRulesetVersion: string;
  synonymDictVersion: string;
  sourceObjectId: string;
  transformVersion: string;
}

export interface SilverQuantityNormalizedRow {
  quantityId: string;
  rawId: string;
  normalizedAmount?: number;
  normalizedUnit?: string;
  unitFamily: "mass" | "volume" | "piece" | "other";
  requiresReview: boolean;
  sourceObjectId: string;
  transformVersion: string;
}

export interface SilverPdfLineRow {
  pdfLineId: string;
  weekId: string;
  lineText: string;
  sourceObjectId: string;
  transformVersion: string;
}

export interface SilverReconcileResultRow {
  reconcileId: string;
  weekId: string;
  rawId: string;
  reconcileStatus: ReconcileStatus;
  note?: string;
  sourceObjectId: string;
  transformVersion: string;
}

export interface SilverDataQualityEventRow {
  eventId: string;
  severity: QualitySeverity;
  category: string;
  message: string;
  sourceObjectId: string;
  transformVersion: string;
  createdAt: string;
}

export interface SilverTransformOutput {
  weeks: SilverWeekRow[];
  meals: SilverMealRow[];
  ingredientsRaw: SilverIngredientRawRow[];
  ingredientsCanonical: SilverIngredientCanonicalRow[];
  quantitiesNormalized: SilverQuantityNormalizedRow[];
  pdfLines: SilverPdfLineRow[];
  reconcileResults: SilverReconcileResultRow[];
  dataQualityEvents: SilverDataQualityEventRow[];
}

export interface BronzeLikeMealIngredient {
  text: string;
  amount?: string | number;
  unit?: string;
}

export interface BronzeLikeMeal {
  day: string;
  meal: string;
  recipeId?: string;
  ingredients?: BronzeLikeMealIngredient[];
}

export interface BronzeLikeWeekPayload {
  meals?: BronzeLikeMeal[];
  groceries?: string[];
  pdfLines?: string[];
}
