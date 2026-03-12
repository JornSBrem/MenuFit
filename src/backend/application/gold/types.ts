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

export interface GoldRecipeTip {
  text: string;
}

export interface GoldRecipeNutrition {
  code: string;
  label: string;
  amount?: number;
  unit?: string;
}

export interface GoldRecipePreparationTime {
  amount?: number;
  unit?: string;
  label: string;
}

export interface GoldLinkedDayMenuView {
  dayMenuId: string;
  slug: string;
  title: string;
  imageUrl?: string;
  kcalVariants: number[];
}

export interface GoldRecipeDetailFields {
  intro?: string;
  ingredientsRelatesTo?: string;
  nutrientsRelatesTo?: string;
  prepTimes?: GoldRecipePreparationTime[];
  tips?: GoldRecipeTip[];
  nutrition?: GoldRecipeNutrition[];
  linkedDayMenus?: GoldLinkedDayMenuView[];
  tags?: string[];
  importedAt?: string;
  sourceUrl?: string;
}

export interface GoldMealView extends GoldRecipeDetailFields {
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
  category?: string;
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
  slug?: string;
  imageUrl?: string;
  kcal?: number;
  ingredients?: GoldMealIngredient[];
  steps?: GoldRecipeStep[];
  intro?: string;
  ingredientsRelatesTo?: string;
  nutrientsRelatesTo?: string;
  prepTimes?: GoldRecipePreparationTime[];
  tips?: GoldRecipeTip[];
  nutrition?: GoldRecipeNutrition[];
  linkedDayMenus?: GoldLinkedDayMenuView[];
  tags?: string[];
  importedAt?: string;
  sourceUrl?: string;
}
