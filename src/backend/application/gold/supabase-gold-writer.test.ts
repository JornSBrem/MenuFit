import assert from "node:assert/strict";
import test from "node:test";

import { PsqlSupabaseGoldWriter } from "./supabase-gold-writer.ts";
import type { GoldReadModel, RecipeView } from "./types.ts";

function createModel(): GoldReadModel {
  return {
    weekPlan: {
      weekPlanId: "weekplan-9",
      year: 2026,
      week: 9,
      kcal: 1800,
      basePersons: 2,
      mealCount: 1,
      sourceObjectId: "bronze-9",
      transformVersion: "gold-v1",
      generatedAt: "2026-03-12T00:00:00.000Z",
    },
    meals: [],
    groceries: [],
    groceryReconcile: [],
    matchStatus: {
      totalItems: 0,
      resolvedItems: 0,
      unresolvedItems: 0,
      coverageScore: 1,
    },
    cartPlan: {
      cartPlanId: "cartplan-9",
      weekPlanId: "weekplan-9",
      itemCount: 0,
      unresolvedCount: 0,
      generatedAt: "2026-03-12T00:00:00.000Z",
    },
  };
}

test("PsqlSupabaseGoldWriter renders and submits sync SQL", () => {
  let capturedSql = "";
  const writer = new PsqlSupabaseGoldWriter({
    connectionString: "postgres://ignored",
    executeSql: (sql) => {
      capturedSql = sql;
    },
  });

  const recipes: RecipeView[] = [
    {
      recipeId: "r-1",
      name: "Recept 1",
    },
  ];

  writer.syncAll([createModel()], recipes);

  assert.match(capturedSql, /insert into public\.menufit_gold_week_plans/);
  assert.match(capturedSql, /insert into public\.menufit_gold_recipes/);
  assert.match(capturedSql, /'dual-write-sync'/);
});
