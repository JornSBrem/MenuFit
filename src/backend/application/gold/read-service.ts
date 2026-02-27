import type { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";
import type { GoldReadModel, GoldRecipeStep, GoldWeekPlanView, RecipeView, WeekGroceriesResponse, WeekSummaryResponse } from "./types";

const keyFromWeek = (year: number, week: number, kcal: number, basePersons: number): string =>
  `${year}:${week}:${kcal}:${basePersons}`;

const roundScaledQuantity = (value: number): number =>
  Math.round((value + Number.EPSILON) * 1000) / 1000;

export class GoldWeekReadService {
  private readonly store = new Map<string, GoldReadModel>();

  private readonly stateStore?: PersistentStateStore;

  constructor(options?: { stateStore?: PersistentStateStore }) {
    this.stateStore = options?.stateStore;
    if (this.stateStore) {
      const persisted = this.stateStore.read().goldReadModels;
      for (const [key, model] of Object.entries(persisted)) {
        this.store.set(key, model);
      }
    }
  }

  upsert(model: GoldReadModel): void {
    const key = keyFromWeek(
      model.weekPlan.year,
      model.weekPlan.week,
      model.weekPlan.kcal,
      model.weekPlan.basePersons,
    );
    this.store.set(key, model);
    this.stateStore?.update((draft) => {
      draft.goldReadModels[key] = structuredClone(model);
    });
  }

  /**
   * Laadt meerdere gold-modellen in één keer in het in-memory store,
   * zonder elke keer de stateStore te schrijven (gebruik voor bulk-recompute).
   * Bel daarna batchPersist() om alles in één keer op te slaan.
   */
  batchLoad(models: GoldReadModel[]): void {
    for (const model of models) {
      const key = keyFromWeek(
        model.weekPlan.year,
        model.weekPlan.week,
        model.weekPlan.kcal,
        model.weekPlan.basePersons,
      );
      this.store.set(key, model);
    }
  }

  /** Schrijft alle in-memory gold-modellen in één stateStore.update() naar schijf. */
  batchPersist(): void {
    if (!this.stateStore) return;
    const snapshot = Array.from(this.store.entries());
    this.stateStore.update((draft) => {
      for (const [key, model] of snapshot) {
        draft.goldReadModels[key] = structuredClone(model);
      }
    });
  }

  getSummary(year: number, week: number, kcal: number, basePersons: number): WeekSummaryResponse | null {
    const model = this.resolveModel(year, week, kcal, basePersons);
    if (!model) {
      return null;
    }

    return {
      weekPlan: model.weekPlan,
      meals: model.meals,
      matchStatus: model.matchStatus,
      cartPlan: model.cartPlan,
    };
  }

  /** Geeft alle opgeslagen weekplannen terug, gesorteerd op jaar/week/kcal. */
  listWeekPlans(): GoldWeekPlanView[] {
    return Array.from(this.store.values())
      .map((model) => model.weekPlan)
      .sort((a, b) =>
        a.year !== b.year ? a.year - b.year :
        a.week !== b.week ? a.week - b.week :
        a.kcal - b.kcal,
      );
  }

  /** Geeft alle unieke recepten terug vanuit de gold data (alleen met recept + afbeelding), gesorteerd op naam. */
  listRecipes(): RecipeView[] {
    const seen = new Map<string, RecipeView>();
    for (const model of this.store.values()) {
      for (const meal of model.meals) {
        if (!meal.recipeId || !meal.imageUrl) continue;
        if (!seen.has(meal.recipeId)) {
          seen.set(meal.recipeId, {
            recipeId: meal.recipeId,
            name: meal.recipeName ?? meal.mealLabel,
            imageUrl: meal.imageUrl,
            kcal: meal.kcal,
            ingredients: meal.ingredients,
            steps: meal.steps,
          });
        }
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name, "nl"));
  }

  /** Geeft alle gold-modellen terug (voor bulk-operaties zoals step-verrijking). */
  listAllModels(): GoldReadModel[] {
    return Array.from(this.store.values());
  }

  /**
   * Verrijkt alle gold-modellen met bereidingsstappen op basis van recipeId.
   * Schrijft daarna alles in één batchPersist naar schijf.
   */
  enrichWithSteps(stepsMap: Map<string, GoldRecipeStep[]>): void {
    if (stepsMap.size === 0) return;
    for (const [key, model] of this.store.entries()) {
      const enrichedMeals = model.meals.map((meal) => {
        if (!meal.recipeId) return meal;
        const steps = stepsMap.get(meal.recipeId);
        if (!steps || steps.length === 0) return meal;
        return { ...meal, steps };
      });
      this.store.set(key, { ...model, meals: enrichedMeals });
    }
    this.batchPersist();
  }

  /**
   * Verrijkt alle gold-modellen met ingrediënten + stappen vanuit website-scraping.
   * - Stappen worden altijd bijgewerkt als beschikbaar.
   * - Ingrediënten worden alleen ingevuld als het maaltijdmoment er nog geen heeft.
   * Schrijft daarna alles in één batchPersist naar schijf.
   */
  enrichWithRecipeData(
    dataMap: Map<string, { ingredients?: GoldMealIngredient[]; steps?: GoldRecipeStep[] }>,
  ): void {
    if (dataMap.size === 0) return;
    for (const [key, model] of this.store.entries()) {
      const enrichedMeals = model.meals.map((meal) => {
        if (!meal.recipeId) return meal;
        const data = dataMap.get(meal.recipeId);
        if (!data) return meal;

        const newSteps = data.steps && data.steps.length > 0 ? data.steps : meal.steps;
        // Vul ingrediënten alleen in als het maaltijdmoment nog geen eigen ingrediënten heeft
        const newIngredients =
          (!meal.ingredients || meal.ingredients.length === 0) &&
          data.ingredients &&
          data.ingredients.length > 0
            ? data.ingredients
            : meal.ingredients;

        return { ...meal, steps: newSteps, ingredients: newIngredients };
      });
      this.store.set(key, { ...model, meals: enrichedMeals });
    }
    this.batchPersist();
  }

  getGroceries(year: number, week: number, kcal: number, basePersons: number): WeekGroceriesResponse | null {
    const model = this.resolveModel(year, week, kcal, basePersons);
    if (!model) {
      return null;
    }

    return {
      weekPlanId: model.weekPlan.weekPlanId,
      groceries: model.groceries,
      reconcile: model.groceryReconcile,
    };
  }

  private resolveModel(year: number, week: number, kcal: number, basePersons: number): GoldReadModel | null {
    const exact = this.store.get(keyFromWeek(year, week, kcal, basePersons));
    if (exact) {
      return exact;
    }

    const baseline = this.findClosestBaseline(year, week, basePersons, kcal);
    if (!baseline) {
      return null;
    }

    return this.deriveKcalProfile(baseline, kcal);
  }

  private findClosestBaseline(
    year: number,
    week: number,
    basePersons: number,
    targetKcal: number,
  ): GoldReadModel | null {
    const candidates = Array.from(this.store.values()).filter(
      (model) =>
        model.weekPlan.year === year &&
        model.weekPlan.week === week &&
        model.weekPlan.basePersons === basePersons,
    );
    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((left, right) => {
      const delta = Math.abs(left.weekPlan.kcal - targetKcal) - Math.abs(right.weekPlan.kcal - targetKcal);
      if (delta !== 0) {
        return delta;
      }
      return left.weekPlan.kcal - right.weekPlan.kcal;
    });

    return candidates[0] ?? null;
  }

  private deriveKcalProfile(source: GoldReadModel, targetKcal: number): GoldReadModel {
    if (source.weekPlan.kcal === targetKcal) {
      return source;
    }

    const ratio = source.weekPlan.kcal > 0 ? targetKcal / source.weekPlan.kcal : 1;
    const profileSuffix = `kcal-${targetKcal}`;

    return {
      ...source,
      weekPlan: {
        ...source.weekPlan,
        weekPlanId: `${source.weekPlan.weekPlanId}:${profileSuffix}`,
        kcal: targetKcal,
        transformVersion: `${source.weekPlan.transformVersion}+kcal-profile`,
      },
      groceries: source.groceries.map((item) => ({
        ...item,
        totalAmount:
          typeof item.totalAmount === "number" ? roundScaledQuantity(item.totalAmount * ratio) : item.totalAmount,
      })),
      cartPlan: {
        ...source.cartPlan,
        cartPlanId: `${source.cartPlan.cartPlanId}:${profileSuffix}`,
        weekPlanId: `${source.weekPlan.weekPlanId}:${profileSuffix}`,
      },
    };
  }
}
