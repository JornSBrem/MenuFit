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
