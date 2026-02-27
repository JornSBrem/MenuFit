import type { ReconcileStatus, SilverTransformOutput, TransformContext } from "../silver";

export interface GoldWeekPlanView {
  weekPlanId: string;
  year: number;
  week: number;
  kcal: number;
  basePersons: number;
  mealCount: number;
  sourceObjectId: string;
  transformVersion: string;
  generatedAt: string;
}

export interface GoldMealIngredient {
  text: string;
}

export interface GoldRecipeStep {
  step: number;
  text: string;
}

export interface GoldMealView {
  mealId: string;
  dayLabel: string;
  mealLabel: string;
  recipeId?: string;
  recipeName?: string;
  imageUrl?: string;
  kcal?: number;
  ingredients?: GoldMealIngredient[];
  steps?: GoldRecipeStep[];
}

export interface GoldGroceryTotalView {
  canonicalName: string;
  totalAmount?: number;
  unit?: string;
  requiresReview: boolean;
}

export interface GoldGroceryReconcileView {
  canonicalName: string;
  reconcileStatus: ReconcileStatus;
  note?: string;
}

export interface GoldMatchStatusView {
  totalItems: number;
  resolvedItems: number;
  unresolvedItems: number;
  coverageScore: number;
}

export interface GoldCartPlanView {
  cartPlanId: string;
  weekPlanId: string;
  itemCount: number;
  unresolvedCount: number;
  generatedAt: string;
}

export interface GoldReadModel {
  weekPlan: GoldWeekPlanView;
  meals: GoldMealView[];
  groceries: GoldGroceryTotalView[];
  groceryReconcile: GoldGroceryReconcileView[];
  matchStatus: GoldMatchStatusView;
  cartPlan: GoldCartPlanView;
}

export interface GoldProjectionInput {
  context: TransformContext;
  silver: SilverTransformOutput;
}

export interface WeekSummaryResponse {
  weekPlan: GoldWeekPlanView;
  meals: GoldMealView[];
  matchStatus: GoldMatchStatusView;
  cartPlan: GoldCartPlanView;
}

export interface WeekGroceriesResponse {
  weekPlanId: string;
  groceries: GoldGroceryTotalView[];
  reconcile: GoldGroceryReconcileView[];
}

export interface RecipeView {
  recipeId: string;
  name: string;
  imageUrl?: string;
  kcal?: number;
  ingredients?: GoldMealIngredient[];
  steps?: GoldRecipeStep[];
}
