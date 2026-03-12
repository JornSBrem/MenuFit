import assert from "node:assert/strict";
import test from "node:test";

import { buildSupabaseGoldBackfillSql } from "./supabase-backfill.ts";
import type { PersistentAppState } from "../../integrations/storage/persistent-state-store.ts";

function createState(): PersistentAppState {
  return {
    schemaVersion: 7,
    silverTransforms: {},
    goldReadModels: {
      "2026:11:1800:2": {
        weekPlan: {
          weekPlanId: "weekplan-11",
          year: 2026,
          week: 11,
          kcal: 1800,
          basePersons: 2,
          mealCount: 1,
          sourceObjectId: "bronze-11",
          transformVersion: "gold-v1",
          generatedAt: "2026-03-12T10:00:00.000Z",
        },
        meals: [
          {
            mealId: "meal-1",
            dayLabel: "maandag",
            mealLabel: "Diner",
            recipeId: "butterchicken",
            recipeName: "Butter chicken",
            imageUrl: "https://example.invalid/meal.jpg",
            kcal: 640,
          },
        ],
        groceries: [
          {
            canonicalName: "kipfilet",
            totalAmount: 300,
            unit: "g",
            requiresReview: false,
          },
        ],
        groceryReconcile: [
          {
            canonicalName: "kipfilet",
            reconcileStatus: "matched",
          },
        ],
        matchStatus: {
          totalItems: 1,
          resolvedItems: 1,
          unresolvedItems: 0,
          coverageScore: 1,
        },
        cartPlan: {
          cartPlanId: "cartplan-11",
          weekPlanId: "weekplan-11",
          itemCount: 1,
          unresolvedCount: 0,
          generatedAt: "2026-03-12T10:00:00.000Z",
        },
      },
    },
    recipeCatalog: {
      butterchicken: {
        recipeId: "butterchicken",
        slug: "butterchicken",
        name: "Butter chicken met rijst",
        imageUrl: "https://example.invalid/recipe.jpg",
        kcal: 644,
        ingredients: [{ text: "300 gr kip" }],
        steps: [{ step: 1, text: "Bak de kip." }],
        tips: [{ text: "Voeg koriander toe." }],
        tags: ["Diner"],
        prepTimes: [{ label: "Bereidingstijd", amount: 25, unit: "min" }],
        nutrition: [{ code: "Eiwit", label: "Eiwit", amount: 38, unit: "gr" }],
        linkedDayMenus: [{ dayMenuId: "dm-1", slug: "menu-ma", title: "Maandag menu", kcalVariants: [1800] }],
        importedAt: "2026-03-12T09:00:00.000Z",
        sourceUrl: "https://backend.projectgezond.nl/api/recipe/butterchicken",
      },
    },
    cartReportsByIdempotencyKey: {},
    systemJobs: [],
    systemReports: [],
    matchingQueue: [],
    matchingAuditTrail: [],
    matchingOverrides: [],
    auditTrail: [],
    households: [],
    householdInvitations: [],
    authSessions: [],
    providerSessions: [],
    schedulerRuns: [],
    retryQueueEntries: [],
    userAccounts: [],
    pushDeviceTokens: [],
    updatedAt: "2026-03-12T10:00:00.000Z",
  };
}

test("buildSupabaseGoldBackfillSql emits deterministic inserts for gold backfill", () => {
  const sql = buildSupabaseGoldBackfillSql(createState(), {
    importRunId: "backfill-1",
    actorUserId: "740e26df-16c3-4c97-a346-c6bd1313d053",
  });

  assert.match(sql, /begin;/);
  assert.match(sql, /delete from public\.menufit_gold_week_plans;/);
  assert.match(sql, /insert into public\.menufit_gold_recipes/);
  assert.match(sql, /Butter chicken met rijst/);
  assert.match(sql, /insert into public\.menufit_gold_week_plans/);
  assert.match(sql, /weekplan-11/);
  assert.match(sql, /insert into public\.menufit_gold_groceries/);
  assert.match(sql, /insert into public\.menufit_import_runs/);
  assert.match(sql, /commit;/);
});
