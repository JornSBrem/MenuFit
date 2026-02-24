import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { PersistentStateStore } from "../integrations/storage/persistent-state-store.ts";
import { ProductionScheduler } from "./production-scheduler.ts";

test("production scheduler tracks completed and failed runs", async () => {
  let now = 2_020_000_000;
  const scheduler = new ProductionScheduler({
    nowEpochSeconds: () => now,
  });

  scheduler.registerJob("ingest:1", async () => {
    now += 1;
  });
  scheduler.registerJob("system:1", async () => {
    now += 1;
    throw new Error("boom");
  });

  const completed = await scheduler.runJob("ingest:1");
  assert.equal(completed.status, "completed");

  const failed = await scheduler.runJob("system:1");
  assert.equal(failed.status, "failed");
  assert.equal(failed.message, "boom");
  assert.equal(scheduler.listRuns().length, 2);
});

test("production scheduler rehydrates persisted runs", async () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-scheduler-"));
  try {
    let now = 2_030_000_000;
    const stateStore = new PersistentStateStore(join(dir, "state.json"));

    const first = new ProductionScheduler({
      nowEpochSeconds: () => now,
      stateStore,
    });
    first.registerJob("ingest:1", async () => {
      now += 1;
    });
    await first.runJob("ingest:1");

    const second = new ProductionScheduler({
      nowEpochSeconds: () => now,
      stateStore,
    });
    assert.equal(second.listRuns().length, 1);

    second.registerJob("ingest:2", async () => {
      now += 1;
    });
    const secondRun = await second.runJob("ingest:2");
    assert.equal(secondRun.runId, "sched-2");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
