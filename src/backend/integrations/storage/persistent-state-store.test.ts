import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  CURRENT_STATE_SCHEMA_VERSION,
  PersistentStateStore,
} from "./persistent-state-store.ts";

const withTempStateFile = (run: (stateFile: string) => void): void => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-state-"));
  const stateFile = join(dir, "state.json");
  try {
    run(stateFile);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test("persistent state store creates default state when file does not exist", () => {
  withTempStateFile((stateFile) => {
    const store = new PersistentStateStore(stateFile);
    const state = store.read();
    assert.equal(state.schemaVersion, CURRENT_STATE_SCHEMA_VERSION);
    assert.deepEqual(state.goldReadModels, {});
    assert.deepEqual(state.silverTransforms, {});
    assert.deepEqual(state.systemJobs, []);
  });
});

test("persistent state store migrates legacy schema to current schema", () => {
  withTempStateFile((stateFile) => {
    writeFileSync(
      stateFile,
      JSON.stringify(
        {
          gold: {
            "2026:9:1800:2": {
              weekPlan: {
                weekPlanId: "weekplan-9",
                year: 2026,
                week: 9,
                kcal: 1800,
                basePersons: 2,
                mealCount: 7,
                sourceObjectId: "bronze-9",
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
            },
          },
          jobs: [{ jobId: "system-job-1" }],
        },
        null,
        2,
      ),
      "utf8",
    );

    const store = new PersistentStateStore(stateFile);
    const state = store.read();
    assert.equal(state.schemaVersion, CURRENT_STATE_SCHEMA_VERSION);
    assert.equal(Object.keys(state.goldReadModels).length, 1);
    assert.equal(state.systemJobs.length, 1);
    assert.deepEqual(state.cartReportsByIdempotencyKey, {});
  });
});

test("persistent state store update writes to disk", () => {
  withTempStateFile((stateFile) => {
    const store = new PersistentStateStore(stateFile);
    store.update((draft) => {
      draft.cartReportsByIdempotencyKey["idem-1"] = {
        reportId: "cart-sync-1",
        idempotencyKey: "idem-1",
        weekPlanId: "weekplan-9",
        householdId: "house-1",
        source: "user",
        mode: "execute",
        status: "synced",
        itemCount: 1,
        syncedCount: 1,
        failedCount: 0,
        idempotentReplay: false,
        message: "ok",
        createdAt: "2026-02-25T00:00:00.000Z",
      };
    });

    const raw = JSON.parse(readFileSync(stateFile, "utf8")) as { cartReportsByIdempotencyKey?: Record<string, unknown> };
    assert.equal(Boolean(raw.cartReportsByIdempotencyKey?.["idem-1"]), true);
  });
});
