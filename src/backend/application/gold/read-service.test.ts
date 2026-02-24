import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";
import { GoldWeekReadService } from "./read-service.ts";

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
