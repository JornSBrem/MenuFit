import type { PersistentAppState } from "../../integrations/storage/persistent-state-store.ts";
import type {
  GoldLinkedDayMenuView,
  GoldMealView,
  GoldRecipePreparationTime,
  GoldRecipeTip,
  GoldRecipeNutrition,
  GoldRecipeStep,
  RecipeView,
} from "./types.ts";

export interface SupabaseGoldBackfillOptions {
  importRunId: string;
  actorUserId?: string;
  source?: string;
}

type SqlScalar = string | number | boolean | null;

interface SqlRecipeRow {
  recipeId: string;
  slug?: string;
  name: string;
  imageUrl?: string;
  kcal?: number;
  intro?: string;
  ingredientsRelatesTo?: string;
  nutrientsRelatesTo?: string;
  importedAt?: string;
  sourceUrl?: string;
  tags: string[];
  prepTimes: GoldRecipePreparationTime[];
  ingredients: { text: string }[];
  steps: GoldRecipeStep[];
  tips: GoldRecipeTip[];
  nutrition: GoldRecipeNutrition[];
  linkedDayMenus: GoldLinkedDayMenuView[];
}

const sqlString = (value: string): string => `'${value.replaceAll("'", "''")}'`;
const sqlNullable = (value: SqlScalar | undefined): string => {
  if (value === undefined || value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return sqlString(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
};

const sqlTextArray = (values: string[]): string =>
  `array[${values.map((value) => sqlString(value)).join(", ")}]::text[]`;

const sqlIntArray = (values: number[]): string =>
  values.length === 0
    ? "'{}'::integer[]"
    : `array[${values.map((value) => String(Math.trunc(value))).join(", ")}]::integer[]`;

const normalizeRecipe = (
  recipeId: string,
  input: Partial<SqlRecipeRow> & { name: string },
): SqlRecipeRow => ({
  recipeId,
  slug: input.slug,
  name: input.name,
  imageUrl: input.imageUrl,
  kcal: input.kcal,
  intro: input.intro,
  ingredientsRelatesTo: input.ingredientsRelatesTo,
  nutrientsRelatesTo: input.nutrientsRelatesTo,
  importedAt: input.importedAt,
  sourceUrl: input.sourceUrl,
  tags: input.tags ?? [],
  prepTimes: input.prepTimes ?? [],
  ingredients: input.ingredients ?? [],
  steps: input.steps ?? [],
  tips: input.tips ?? [],
  nutrition: input.nutrition ?? [],
  linkedDayMenus: input.linkedDayMenus ?? [],
});

function mergeRecipe(into: SqlRecipeRow, next: Partial<SqlRecipeRow> & { name?: string }): SqlRecipeRow {
  return {
    ...into,
    slug: into.slug ?? next.slug,
    name: into.name || next.name || into.recipeId,
    imageUrl: into.imageUrl ?? next.imageUrl,
    kcal: into.kcal ?? next.kcal,
    intro: into.intro ?? next.intro,
    ingredientsRelatesTo: into.ingredientsRelatesTo ?? next.ingredientsRelatesTo,
    nutrientsRelatesTo: into.nutrientsRelatesTo ?? next.nutrientsRelatesTo,
    importedAt: into.importedAt ?? next.importedAt,
    sourceUrl: into.sourceUrl ?? next.sourceUrl,
    tags: into.tags.length > 0 ? into.tags : next.tags ?? [],
    prepTimes: into.prepTimes.length > 0 ? into.prepTimes : next.prepTimes ?? [],
    ingredients: into.ingredients.length > 0 ? into.ingredients : next.ingredients ?? [],
    steps: into.steps.length > 0 ? into.steps : next.steps ?? [],
    tips: into.tips.length > 0 ? into.tips : next.tips ?? [],
    nutrition: into.nutrition.length > 0 ? into.nutrition : next.nutrition ?? [],
    linkedDayMenus: into.linkedDayMenus.length > 0 ? into.linkedDayMenus : next.linkedDayMenus ?? [],
  };
}

function collectRecipes(state: PersistentAppState): SqlRecipeRow[] {
  const recipes = new Map<string, SqlRecipeRow>();

  for (const [recipeId, recipe] of Object.entries(state.recipeCatalog)) {
    if (!recipeId.trim()) continue;
    recipes.set(
      recipeId,
      normalizeRecipe(recipeId, {
        name: recipe.name,
        slug: recipe.slug,
        imageUrl: recipe.imageUrl,
        kcal: recipe.kcal,
        intro: recipe.intro,
        ingredientsRelatesTo: recipe.ingredientsRelatesTo,
        nutrientsRelatesTo: recipe.nutrientsRelatesTo,
        importedAt: recipe.importedAt,
        sourceUrl: recipe.sourceUrl,
        tags: recipe.tags,
        prepTimes: recipe.prepTimes,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        tips: recipe.tips,
        nutrition: recipe.nutrition,
        linkedDayMenus: recipe.linkedDayMenus,
      }),
    );
  }

  for (const model of Object.values(state.goldReadModels)) {
    for (const meal of model.meals) {
      if (!meal.recipeId?.trim()) continue;
      const existing = recipes.get(meal.recipeId);
      const next = {
        name: meal.recipeName ?? meal.mealLabel,
        slug: meal.recipeId,
        imageUrl: meal.imageUrl,
        kcal: meal.kcal,
        intro: meal.intro,
        ingredientsRelatesTo: meal.ingredientsRelatesTo,
        nutrientsRelatesTo: meal.nutrientsRelatesTo,
        tags: meal.tags,
        prepTimes: meal.prepTimes,
        ingredients: meal.ingredients,
        steps: meal.steps,
        tips: meal.tips,
        nutrition: meal.nutrition,
        linkedDayMenus: meal.linkedDayMenus,
      };
      recipes.set(
        meal.recipeId,
        existing
          ? mergeRecipe(existing, next)
          : normalizeRecipe(meal.recipeId, next),
      );
    }
  }

  return Array.from(recipes.values()).sort((left, right) => left.recipeId.localeCompare(right.recipeId));
}

function renderMealInserts(meals: GoldMealView[], weekPlanId: string): string[] {
  return meals.map((meal, index) =>
    `insert into public.menufit_gold_meals (meal_id, week_plan_id, recipe_id, day_label, meal_label, recipe_name, image_url, kcal, sort_order)
values (${sqlString(meal.mealId)}, ${sqlString(weekPlanId)}, ${sqlNullable(meal.recipeId)}, ${sqlString(meal.dayLabel)}, ${sqlString(meal.mealLabel)}, ${sqlNullable(meal.recipeName)}, ${sqlNullable(meal.imageUrl)}, ${sqlNullable(meal.kcal)}, ${index});`,
  );
}

export function buildSupabaseGoldBackfillSql(
  state: PersistentAppState,
  options: SupabaseGoldBackfillOptions,
): string {
  const recipes = collectRecipes(state);
  const lines: string[] = [];

  lines.push("begin;");
  lines.push("");
  lines.push("-- Reset gold serving tables for deterministic full backfill");
  lines.push("delete from public.menufit_weight_logs;");
  lines.push("delete from public.menufit_gold_cart_plans;");
  lines.push("delete from public.menufit_gold_grocery_reconcile;");
  lines.push("delete from public.menufit_gold_groceries;");
  lines.push("delete from public.menufit_gold_meals;");
  lines.push("delete from public.menufit_gold_linked_day_menus;");
  lines.push("delete from public.menufit_gold_recipe_nutrition;");
  lines.push("delete from public.menufit_gold_recipe_tips;");
  lines.push("delete from public.menufit_gold_recipe_steps;");
  lines.push("delete from public.menufit_gold_recipe_ingredients;");
  lines.push("delete from public.menufit_gold_recipe_prep_times;");
  lines.push("delete from public.menufit_gold_recipe_tags;");
  lines.push("delete from public.menufit_gold_recipes;");
  lines.push("delete from public.menufit_gold_week_plans;");
  lines.push("");

  for (const recipe of recipes) {
    lines.push(
      `insert into public.menufit_gold_recipes (recipe_id, slug, name, image_url, kcal, intro, ingredients_relates_to, nutrients_relates_to, imported_at, source_url)
values (${sqlString(recipe.recipeId)}, ${sqlNullable(recipe.slug)}, ${sqlString(recipe.name)}, ${sqlNullable(recipe.imageUrl)}, ${sqlNullable(recipe.kcal)}, ${sqlNullable(recipe.intro)}, ${sqlNullable(recipe.ingredientsRelatesTo)}, ${sqlNullable(recipe.nutrientsRelatesTo)}, ${sqlNullable(recipe.importedAt)}, ${sqlNullable(recipe.sourceUrl)});`,
    );

    for (const tag of recipe.tags) {
      lines.push(
        `insert into public.menufit_gold_recipe_tags (recipe_id, tag) values (${sqlString(recipe.recipeId)}, ${sqlString(tag)});`,
      );
    }
    recipe.prepTimes.forEach((prepTime, index) => {
      lines.push(
        `insert into public.menufit_gold_recipe_prep_times (recipe_id, ordinal, label, amount, unit)
values (${sqlString(recipe.recipeId)}, ${index}, ${sqlString(prepTime.label)}, ${sqlNullable(prepTime.amount)}, ${sqlNullable(prepTime.unit)});`,
      );
    });
    recipe.ingredients.forEach((ingredient, index) => {
      lines.push(
        `insert into public.menufit_gold_recipe_ingredients (recipe_id, ordinal, ingredient_text)
values (${sqlString(recipe.recipeId)}, ${index}, ${sqlString(ingredient.text)});`,
      );
    });
    recipe.steps.forEach((step) => {
      lines.push(
        `insert into public.menufit_gold_recipe_steps (recipe_id, step_number, step_text)
values (${sqlString(recipe.recipeId)}, ${step.step}, ${sqlString(step.text)});`,
      );
    });
    recipe.tips.forEach((tip, index) => {
      lines.push(
        `insert into public.menufit_gold_recipe_tips (recipe_id, ordinal, tip_text)
values (${sqlString(recipe.recipeId)}, ${index}, ${sqlString(tip.text)});`,
      );
    });
    recipe.nutrition.forEach((nutrition) => {
      lines.push(
        `insert into public.menufit_gold_recipe_nutrition (recipe_id, code, label, amount, unit)
values (${sqlString(recipe.recipeId)}, ${sqlString(nutrition.code)}, ${sqlString(nutrition.label)}, ${sqlNullable(nutrition.amount)}, ${sqlNullable(nutrition.unit)});`,
      );
    });
    recipe.linkedDayMenus.forEach((linkedDayMenu) => {
      lines.push(
        `insert into public.menufit_gold_linked_day_menus (recipe_id, day_menu_id, slug, title, image_url, kcal_variants)
values (${sqlString(recipe.recipeId)}, ${sqlString(linkedDayMenu.dayMenuId)}, ${sqlString(linkedDayMenu.slug)}, ${sqlString(linkedDayMenu.title)}, ${sqlNullable(linkedDayMenu.imageUrl)}, ${sqlIntArray(linkedDayMenu.kcalVariants)});`,
      );
    });
  }

  for (const model of Object.values(state.goldReadModels)) {
    lines.push(
      `insert into public.menufit_gold_week_plans (week_plan_id, year, week, kcal, base_persons, meal_count, source_object_id, transform_version, generated_at)
values (${sqlString(model.weekPlan.weekPlanId)}, ${model.weekPlan.year}, ${model.weekPlan.week}, ${model.weekPlan.kcal}, ${model.weekPlan.basePersons}, ${model.weekPlan.mealCount}, ${sqlString(model.weekPlan.sourceObjectId)}, ${sqlString(model.weekPlan.transformVersion)}, ${sqlString(model.weekPlan.generatedAt)});`,
    );
    lines.push(...renderMealInserts(model.meals, model.weekPlan.weekPlanId));
    for (const grocery of model.groceries) {
      lines.push(
        `insert into public.menufit_gold_groceries (week_plan_id, canonical_name, total_amount, unit, requires_review, category)
values (${sqlString(model.weekPlan.weekPlanId)}, ${sqlString(grocery.canonicalName)}, ${sqlNullable(grocery.totalAmount)}, ${sqlNullable(grocery.unit)}, ${grocery.requiresReview ? "true" : "false"}, ${sqlNullable(grocery.category)});`,
      );
    }
    for (const reconcile of model.groceryReconcile) {
      lines.push(
        `insert into public.menufit_gold_grocery_reconcile (week_plan_id, canonical_name, reconcile_status, note)
values (${sqlString(model.weekPlan.weekPlanId)}, ${sqlString(reconcile.canonicalName)}, ${sqlString(reconcile.reconcileStatus)}, ${sqlNullable(reconcile.note)});`,
      );
    }
    lines.push(
      `insert into public.menufit_gold_cart_plans (cart_plan_id, week_plan_id, item_count, unresolved_count, generated_at)
values (${sqlString(model.cartPlan.cartPlanId)}, ${sqlString(model.cartPlan.weekPlanId)}, ${model.cartPlan.itemCount}, ${model.cartPlan.unresolvedCount}, ${sqlString(model.cartPlan.generatedAt)});`,
    );
  }

  lines.push("");
  lines.push(
    `insert into public.menufit_import_runs (import_run_id, source, mode, status, started_at, finished_at, actor_user_id, details)
values (${sqlString(options.importRunId)}, ${sqlString(options.source ?? "local-state-backfill")}, 'backfill', 'completed', now(), now(), ${sqlNullable(options.actorUserId)}, jsonb_build_object('weekPlans', ${Object.keys(state.goldReadModels).length}, 'recipes', ${recipes.length}));`,
  );
  lines.push("");
  lines.push("commit;");

  return `${lines.join("\n")}\n`;
}
