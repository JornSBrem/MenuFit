import { createHash } from "node:crypto";

import type { SilverIngredientCanonicalRow, SilverQuantityNormalizedRow } from "../silver";
import type {
  GoldGroceryReconcileView,
  GoldGroceryTotalView,
  GoldMealIngredient,
  GoldMealView,
  GoldProjectionInput,
  GoldReadModel,
} from "./types";

const hashId = (seed: string): string => createHash("sha256").update(seed).digest("hex").slice(0, 24);

type GroceryAccumulator = {
  canonicalName: string;
  totalAmount?: number;
  unit?: string;
  requiresReview: boolean;
};

const buildCanonicalMap = (canonicalRows: SilverIngredientCanonicalRow[]): Map<string, string> =>
  new Map(canonicalRows.map((row) => [row.rawId, row.canonicalName]));

const aggregateGroceries = (
  canonicalRows: SilverIngredientCanonicalRow[],
  quantityRows: SilverQuantityNormalizedRow[],
): GoldGroceryTotalView[] => {
  const canonicalByRaw = buildCanonicalMap(canonicalRows);
  const map = new Map<string, GroceryAccumulator>();

  for (const quantity of quantityRows) {
    const canonicalName = canonicalByRaw.get(quantity.rawId) ?? quantity.rawId;
    const existing = map.get(canonicalName) ?? {
      canonicalName,
      totalAmount: undefined,
      unit: quantity.normalizedUnit,
      requiresReview: false,
    };

    const amount = quantity.normalizedAmount;
    if (typeof amount === "number") {
      existing.totalAmount = (existing.totalAmount ?? 0) + amount;
    }
    if (!existing.unit && quantity.normalizedUnit) {
      existing.unit = quantity.normalizedUnit;
    }
    existing.requiresReview = existing.requiresReview || quantity.requiresReview;
    map.set(canonicalName, existing);
  }

  return Array.from(map.values())
    .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName))
    .map((row) => ({
      canonicalName: row.canonicalName,
      totalAmount: row.totalAmount,
      unit: row.unit,
      requiresReview: row.requiresReview,
    }));
};

const buildReconcile = (
  input: GoldProjectionInput,
): GoldGroceryReconcileView[] => {
  const canonicalByRaw = buildCanonicalMap(input.silver.ingredientsCanonical);

  return input.silver.reconcileResults
    .map((row) => ({
      canonicalName: canonicalByRaw.get(row.rawId) ?? row.rawId,
      reconcileStatus: row.reconcileStatus,
      note: row.note,
    }))
    .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
};

export const projectSilverToGold = (input: GoldProjectionInput): GoldReadModel => {
  const weekPlanId = hashId(
    `${input.context.sourceObjectId}:${input.context.year}:${input.context.week}:${input.context.kcal}:${input.context.basePersons}:gold`,
  );
  const groceries = aggregateGroceries(
    input.silver.ingredientsCanonical,
    input.silver.quantitiesNormalized,
  );
  const groceryReconcile = buildReconcile(input);

  const totalItems = groceries.length;
  const unresolvedItems = groceryReconcile.filter((row) => row.reconcileStatus !== "matched").length;
  const resolvedItems = Math.max(totalItems - unresolvedItems, 0);
  const coverageScore = totalItems === 0 ? 1 : resolvedItems / totalItems;
  // Ingrediënten per maaltijd opbouwen (op volgorde van rawId)
  const ingredientsByMeal = new Map<string, string[]>();
  for (const raw of input.silver.ingredientsRaw) {
    const existing = ingredientsByMeal.get(raw.mealId) ?? [];
    existing.push(raw.ingredientText);
    ingredientsByMeal.set(raw.mealId, existing);
  }

  // Sorteervolgorde voor maaltijdmomenten binnen een dag
  const MEAL_MOMENT_ORDER: Record<string, number> = {
    "Ontbijt": 0,
    "Tussendoor (ochtend)": 1,
    "Lunch": 2,
    "Tussendoor (middag)": 3,
    "Diner": 4,
    "Snack": 5,
  };

  // Sorteervolgorde voor weekdagen
  const DAY_ORDER: Record<string, number> = {
    "maandag": 0, "dinsdag": 1, "woensdag": 2, "donderdag": 3,
    "vrijdag": 4, "zaterdag": 5, "zondag": 6,
  };

  const getMealMomentOrder = (label: string): number => MEAL_MOMENT_ORDER[label] ?? 99;
  const getDayOrder = (label: string): number => DAY_ORDER[label.toLowerCase()] ?? 99;

  const meals: GoldMealView[] = input.silver.meals
    .map((meal) => {
      const rawIngredients = ingredientsByMeal.get(meal.mealId) ?? [];
      const ingredients: GoldMealIngredient[] = rawIngredients.map((text) => ({ text }));
      return {
        mealId: meal.mealId,
        dayLabel: meal.dayLabel,
        mealLabel: meal.mealLabel,
        recipeId: meal.recipeId,
        recipeName: meal.recipeName,
        imageUrl: meal.imageUrl,
        kcal: meal.kcal,
        ingredients: ingredients.length > 0 ? ingredients : undefined,
      };
    })
    .sort((left, right) => {
      const dayDiff = getDayOrder(left.dayLabel) - getDayOrder(right.dayLabel);
      if (dayDiff !== 0) return dayDiff;
      return getMealMomentOrder(left.mealLabel) - getMealMomentOrder(right.mealLabel);
    });

  return {
    weekPlan: {
      weekPlanId,
      year: input.context.year,
      week: input.context.week,
      kcal: input.context.kcal,
      basePersons: input.context.basePersons,
      mealCount: input.silver.meals.length,
      sourceObjectId: input.context.sourceObjectId,
      transformVersion: input.context.transformVersion,
      generatedAt: new Date().toISOString(),
    },
    meals,
    groceries,
    groceryReconcile,
    matchStatus: {
      totalItems,
      resolvedItems,
      unresolvedItems,
      coverageScore,
    },
    cartPlan: {
      cartPlanId: `${weekPlanId}:cart`,
      weekPlanId,
      itemCount: totalItems,
      unresolvedCount: unresolvedItems,
      generatedAt: new Date().toISOString(),
    },
  };
};
