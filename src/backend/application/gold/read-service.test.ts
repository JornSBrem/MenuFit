import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";
import { GoldWeekReadService } from "./read-service.ts";
import type { SupabaseGoldWriter } from "./supabase-gold-writer.ts";

test("gold read service persists and reloads week models", () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-gold-"));
  try {
    const stateStore = new PersistentStateStore(join(dir, "state.json"));
    const service = new GoldWeekReadService({ stateStore });
    service.upsert({
      weekPlan: {
        weekPlanId: "weekplan-9",
        year: 2026,
        week: 9,
        kcal: 1800,
        basePersons: 2,
        mealCount: 7,
        sourceObjectId: "bronze-week-9",
        transformVersion: "gold-v1",
        generatedAt: "2026-02-25T00:00:00.000Z",
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
        generatedAt: "2026-02-25T00:00:00.000Z",
      },
    });

    const reloaded = new GoldWeekReadService({ stateStore });
    const summary = reloaded.getSummary(2026, 9, 1800, 2);
    assert.equal(summary?.weekPlan.weekPlanId, "weekplan-9");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("gold read service derives dynamic kcal profile from closest baseline", () => {
  const service = new GoldWeekReadService();
  service.upsert({
    weekPlan: {
      weekPlanId: "weekplan-9",
      year: 2026,
      week: 9,
      kcal: 1800,
      basePersons: 2,
      mealCount: 7,
      sourceObjectId: "bronze-week-9",
      transformVersion: "gold-v1",
      generatedAt: "2026-02-25T00:00:00.000Z",
    },
    meals: [],
    groceries: [
      {
        canonicalName: "volkoren pasta",
        totalAmount: 240,
        unit: "g",
        requiresReview: false,
      },
      {
        canonicalName: "tomaat",
        totalAmount: 2,
        unit: "stuk",
        requiresReview: false,
      },
    ],
    groceryReconcile: [],
    matchStatus: {
      totalItems: 2,
      resolvedItems: 2,
      unresolvedItems: 0,
      coverageScore: 1,
    },
    cartPlan: {
      cartPlanId: "cartplan-9",
      weekPlanId: "weekplan-9",
      itemCount: 2,
      unresolvedCount: 0,
      generatedAt: "2026-02-25T00:00:00.000Z",
    },
  });

  const summary = service.getSummary(2026, 9, 1700, 2);
  assert.equal(summary?.weekPlan.kcal, 1700);
  assert.equal(summary?.weekPlan.weekPlanId, "weekplan-9:kcal-1700");
  assert.equal(summary?.weekPlan.transformVersion.endsWith("+kcal-profile"), true);

  const groceries = service.getGroceries(2026, 9, 1700, 2);
  assert.equal(groceries?.weekPlanId, "weekplan-9:kcal-1700");
  assert.equal(groceries?.groceries[0]?.totalAmount, 226.667);
  assert.equal(groceries?.groceries[1]?.totalAmount, 1.889);
});

test("gold read service uses deterministic tie-break and keeps not-found boundaries", () => {
  const service = new GoldWeekReadService();
  service.upsert({
    weekPlan: {
      weekPlanId: "weekplan-9-a",
      year: 2026,
      week: 9,
      kcal: 1500,
      basePersons: 2,
      mealCount: 7,
      sourceObjectId: "bronze-week-9-a",
      transformVersion: "gold-v1",
      generatedAt: "2026-02-25T00:00:00.000Z",
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
      cartPlanId: "cartplan-9-a",
      weekPlanId: "weekplan-9-a",
      itemCount: 0,
      unresolvedCount: 0,
      generatedAt: "2026-02-25T00:00:00.000Z",
    },
  });
  service.upsert({
    weekPlan: {
      weekPlanId: "weekplan-9-b",
      year: 2026,
      week: 9,
      kcal: 1800,
      basePersons: 2,
      mealCount: 7,
      sourceObjectId: "bronze-week-9-b",
      transformVersion: "gold-v1",
      generatedAt: "2026-02-25T00:00:00.000Z",
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
      cartPlanId: "cartplan-9-b",
      weekPlanId: "weekplan-9-b",
      itemCount: 0,
      unresolvedCount: 0,
      generatedAt: "2026-02-25T00:00:00.000Z",
    },
  });

  const tied = service.getSummary(2026, 9, 1650, 2);
  assert.equal(tied?.weekPlan.weekPlanId, "weekplan-9-a:kcal-1650");

  const differentBasePersons = service.getSummary(2026, 9, 1650, 3);
  assert.equal(differentBasePersons, null);
  const differentWeek = service.getSummary(2026, 10, 1650, 2);
  assert.equal(differentWeek, null);
});

test("gold read service persists normalized recipe catalog and enriches meals", () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-gold-recipes-"));
  try {
    const stateStore = new PersistentStateStore(join(dir, "state.json"));
    const service = new GoldWeekReadService({ stateStore });
    service.upsert({
      weekPlan: {
        weekPlanId: "weekplan-11",
        year: 2026,
        week: 11,
        kcal: 1800,
        basePersons: 2,
        mealCount: 1,
        sourceObjectId: "bronze-week-11",
        transformVersion: "gold-v1",
        generatedAt: "2026-03-11T00:00:00.000Z",
      },
      meals: [
        {
          mealId: "meal-1",
          dayLabel: "maandag",
          mealLabel: "Diner",
          recipeId: "butterchicken-met-rijst",
          recipeName: "Butter chicken",
          imageUrl: "https://example.invalid/meal.jpg",
          kcal: 650,
        },
      ],
      groceries: [],
      groceryReconcile: [],
      matchStatus: {
        totalItems: 0,
        resolvedItems: 0,
        unresolvedItems: 0,
        coverageScore: 1,
      },
      cartPlan: {
        cartPlanId: "cartplan-11",
        weekPlanId: "weekplan-11",
        itemCount: 0,
        unresolvedCount: 0,
        generatedAt: "2026-03-11T00:00:00.000Z",
      },
    });

    service.upsertRecipes([
      {
        recipeId: "butterchicken-met-rijst",
        slug: "butterchicken-met-rijst",
        name: "Butter chicken met rijst",
        imageUrl: "https://example.invalid/recipe.jpg",
        kcal: 644,
        ingredients: [{ text: "300 gr kip" }],
        steps: [{ step: 1, text: "Bak de kip." }],
        tips: [{ text: "Voeg koriander toe." }],
        nutrition: [{ code: "Eiwit", label: "Eiwit", amount: 38, unit: "gr" }],
        linkedDayMenus: [{ dayMenuId: "dm-1", slug: "menu-ma", title: "Maandag menu", kcalVariants: [1800] }],
        importedAt: "2026-03-11T21:00:00.000Z",
      },
    ]);

    const reloaded = new GoldWeekReadService({ stateStore });
    const recipes = reloaded.listRecipes();
    assert.equal(recipes.length, 1);
    assert.equal(recipes[0]?.tips?.[0]?.text, "Voeg koriander toe.");
    assert.equal(recipes[0]?.nutrition?.[0]?.amount, 38);

    const summary = reloaded.getSummary(2026, 11, 1800, 2);
    assert.equal(summary?.meals[0]?.tips?.[0]?.text, "Voeg koriander toe.");
    assert.equal(summary?.meals[0]?.linkedDayMenus?.[0]?.title, "Maandag menu");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("gold read service mirrors writes to supabase writer when configured", () => {
  const calls: Array<{ models: number; recipes: number }> = [];
  const writer: SupabaseGoldWriter = {
    syncAll(models, recipes) {
      calls.push({ models: models.length, recipes: recipes.length });
    },
  };

  const service = new GoldWeekReadService({ supabaseGoldWriter: writer });
  service.upsert({
    weekPlan: {
      weekPlanId: "weekplan-12",
      year: 2026,
      week: 12,
      kcal: 1800,
      basePersons: 2,
      mealCount: 1,
      sourceObjectId: "bronze-week-12",
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
      cartPlanId: "cartplan-12",
      weekPlanId: "weekplan-12",
      itemCount: 0,
      unresolvedCount: 0,
      generatedAt: "2026-03-12T00:00:00.000Z",
    },
  });
  service.upsertRecipes([
    {
      recipeId: "recipe-12",
      name: "Recept 12",
    },
  ]);

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], { models: 1, recipes: 0 });
  assert.deepEqual(calls[1], { models: 1, recipes: 1 });
});

test("gold read service can enable supabase writer at runtime", () => {
  const calls: Array<{ models: number; recipes: number }> = [];
  const writer: SupabaseGoldWriter = {
    syncAll(models, recipes) {
      calls.push({ models: models.length, recipes: recipes.length });
    },
  };

  const service = new GoldWeekReadService();
  service.upsert({
    weekPlan: {
      weekPlanId: "weekplan-13",
      year: 2026,
      week: 13,
      kcal: 1800,
      basePersons: 2,
      mealCount: 1,
      sourceObjectId: "bronze-week-13",
      transformVersion: "gold-v1",
      generatedAt: "2026-03-13T00:00:00.000Z",
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
      cartPlanId: "cartplan-13",
      weekPlanId: "weekplan-13",
      itemCount: 0,
      unresolvedCount: 0,
      generatedAt: "2026-03-13T00:00:00.000Z",
    },
  });
  assert.equal(calls.length, 0);

  service.setSupabaseGoldWriter(writer);
  service.upsertRecipes([{ recipeId: "recipe-13", name: "Recept 13" }]);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { models: 1, recipes: 1 });
});
