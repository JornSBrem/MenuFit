import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { PersistentStateStore } from "../integrations/storage/persistent-state-store.ts";
import { ProductionJobCoordinator } from "./job-coordinator.ts";
import { PersistentRetryQueue } from "./persistent-retry-queue.ts";
import { ProductionScheduler } from "./production-scheduler.ts";

test("job coordinator enqueues retry entry when scheduled job fails", async () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-jobcoord-"));
  try {
    let now = 2_040_000_000;
    const stateStore = new PersistentStateStore(join(dir, "state.json"));
    const scheduler = new ProductionScheduler({
      nowEpochSeconds: () => now,
      stateStore,
    });
    const retryQueue = new PersistentRetryQueue({
      nowEpochSeconds: () => now,
      stateStore,
    });
    const coordinator = new ProductionJobCoordinator({ scheduler, retryQueue });

    const failedRun = await coordinator.runIngestJob("ingest-1", async () => {
      throw new Error("external timeout");
    });

    assert.equal(failedRun.status, "failed");
    const queued = retryQueue.list("ingest-external");
    assert.equal(queued.length, 1);
    assert.equal(queued[0]?.status, "pending");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("job coordinator processes retry queue entries to completion", async () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-jobcoord-process-"));
  try {
    let now = 2_050_000_000;
    const stateStore = new PersistentStateStore(join(dir, "state.json"));
    const scheduler = new ProductionScheduler({
      nowEpochSeconds: () => now,
      stateStore,
    });
    const retryQueue = new PersistentRetryQueue({
      nowEpochSeconds: () => now,
      stateStore,
    });
    const coordinator = new ProductionJobCoordinator({ scheduler, retryQueue });

    retryQueue.enqueue({
      queueName: "system-external",
      payload: { operationId: "cleanup-1" },
      maxAttempts: 2,
    });

    const completed = await coordinator.processRetryQueue("system-external", async () => {
      now += 1;
    });
    assert.equal(completed?.status, "completed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
