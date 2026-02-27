import { createHash } from "node:crypto";

import { canonicalizeIngredient, normalizeQuantity } from "./normalization.ts";
import { reconcileComputedIngredientsWithPdf } from "./reconcile.ts";
import type {
  BronzeLikeMeal,
  BronzeLikeMealIngredient,
  BronzeLikeWeekPayload,
  SilverDataQualityEventRow,
  SilverIngredientCanonicalRow,
  SilverIngredientRawRow,
  SilverMealRow,
  SilverPdfLineRow,
  SilverQuantityNormalizedRow,
  SilverTransformOutput,
  SilverWeekRow,
  TransformContext,
} from "./types";

const hashId = (seed: string): string => createHash("sha256").update(seed).digest("hex").slice(0, 24);

const extractMeals = (payload: BronzeLikeWeekPayload): BronzeLikeMeal[] => payload.meals ?? [];

const extractPdfLines = (payload: BronzeLikeWeekPayload): string[] => {
  if (payload.pdfLines && payload.pdfLines.length > 0) {
    return payload.pdfLines;
  }
  return payload.groceries ?? [];
};

const ingredientFromMeal = (
  meal: BronzeLikeMeal,
  ingredient: BronzeLikeMealIngredient,
  index: number,
): BronzeLikeMealIngredient => ({
  text: ingredient.text ?? `${meal.meal}-ingredient-${index + 1}`,
  amount: ingredient.amount,
  unit: ingredient.unit,
});

const createWeekRow = (context: TransformContext): SilverWeekRow => ({
  weekId: hashId(`${context.sourceObjectId}:${context.year}:${context.week}:${context.kcal}:${context.basePersons}`),
  year: context.year,
  week: context.week,
  kcal: context.kcal,
  basePersons: context.basePersons,
  sourceObjectId: context.sourceObjectId,
  transformVersion: context.transformVersion,
});

const pushRequiresReviewEvent = (
  events: SilverDataQualityEventRow[],
  context: TransformContext,
  rawId: string,
  ingredientText: string,
): void => {
  events.push({
    eventId: `${rawId}:requires-review`,
    severity: "warning",
    category: "quantity",
    message: `Quantity normalization requires review for ingredient: ${ingredientText}`,
    sourceObjectId: context.sourceObjectId,
    transformVersion: context.transformVersion,
    createdAt: new Date().toISOString(),
  });
};

export const transformBronzeToSilver = (
  payload: BronzeLikeWeekPayload,
  context: TransformContext,
): SilverTransformOutput => {
  const weekRow = createWeekRow(context);
  const meals = extractMeals(payload);
  const pdfLines = extractPdfLines(payload);

  const mealRows: SilverMealRow[] = [];
  const rawRows: SilverIngredientRawRow[] = [];
  const canonicalRows: SilverIngredientCanonicalRow[] = [];
  const quantityRows: SilverQuantityNormalizedRow[] = [];
  const qualityEvents: SilverDataQualityEventRow[] = [];
  const pdfRows: SilverPdfLineRow[] = [];

  for (let mealIndex = 0; mealIndex < meals.length; mealIndex += 1) {
    const meal = meals[mealIndex];
    const mealId = hashId(`${weekRow.weekId}:meal:${mealIndex}:${meal.day}:${meal.meal}`);
    mealRows.push({
      mealId,
      weekId: weekRow.weekId,
      dayLabel: meal.day,
      mealLabel: meal.meal,
      recipeId: meal.recipeId,
      recipeName: meal.recipeName,
      imageUrl: meal.imageUrl,
      kcal: meal.kcal,
      sourceObjectId: context.sourceObjectId,
      transformVersion: context.transformVersion,
    });

    const ingredients = meal.ingredients ?? [];
    for (let ingredientIndex = 0; ingredientIndex < ingredients.length; ingredientIndex += 1) {
      const sourceIngredient = ingredientFromMeal(meal, ingredients[ingredientIndex], ingredientIndex);
      const rawId = hashId(`${mealId}:raw:${ingredientIndex}:${sourceIngredient.text}`);
      const canonicalName = canonicalizeIngredient(sourceIngredient.text);
      const normalized = normalizeQuantity(sourceIngredient.amount, sourceIngredient.unit);

      rawRows.push({
        rawId,
        mealId,
        ingredientText: sourceIngredient.text,
        rawUnit: sourceIngredient.unit,
        rawAmount: sourceIngredient.amount === undefined ? undefined : String(sourceIngredient.amount),
        sourceObjectId: context.sourceObjectId,
        transformVersion: context.transformVersion,
      });

      canonicalRows.push({
        canonicalId: `${rawId}:canonical`,
        rawId,
        canonicalName,
        canonicalRulesetVersion: context.canonicalRulesetVersion,
        synonymDictVersion: context.synonymDictVersion,
        sourceObjectId: context.sourceObjectId,
        transformVersion: context.transformVersion,
      });

      quantityRows.push({
        quantityId: `${rawId}:quantity`,
        rawId,
        normalizedAmount: normalized.normalizedAmount,
        normalizedUnit: normalized.normalizedUnit,
        unitFamily: normalized.unitFamily,
        requiresReview: normalized.requiresReview,
        sourceObjectId: context.sourceObjectId,
        transformVersion: context.transformVersion,
      });

      if (normalized.requiresReview) {
        pushRequiresReviewEvent(qualityEvents, context, rawId, sourceIngredient.text);
      }
    }
  }

  for (let i = 0; i < pdfLines.length; i += 1) {
    const lineText = pdfLines[i];
    pdfRows.push({
      pdfLineId: hashId(`${weekRow.weekId}:pdf:${i}:${lineText}`),
      weekId: weekRow.weekId,
      lineText,
      sourceObjectId: context.sourceObjectId,
      transformVersion: context.transformVersion,
    });
  }

  const reconcile = reconcileComputedIngredientsWithPdf(
    context,
    weekRow.weekId,
    rawRows,
    canonicalRows,
    pdfRows,
  );

  return {
    weeks: [weekRow],
    meals: mealRows,
    ingredientsRaw: rawRows,
    ingredientsCanonical: canonicalRows,
    quantitiesNormalized: quantityRows,
    pdfLines: pdfRows,
    reconcileResults: reconcile.results,
    dataQualityEvents: [...qualityEvents, ...reconcile.qualityEvents],
  };
};
