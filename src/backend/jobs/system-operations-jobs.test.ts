import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { AuditTrailService } from "../application/audit/audit-trail-service.ts";
import { SystemOperationsService } from "../application/system/system-operations-service.ts";
import { PersistentStateStore } from "../integrations/storage/persistent-state-store.ts";
import { ProductionJobCoordinator } from "./job-coordinator.ts";
import { PersistentRetryQueue } from "./persistent-retry-queue.ts";
import { ProductionScheduler } from "./production-scheduler.ts";
import {
  runScheduledCleanupJob,
  runScheduledIngestJob,
} from "./system-operations-jobs.ts";

test("scheduled system operation runs through production scheduler with run/report output", async () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-system-jobs-"));
  try {
    let now = 2_060_000_000;
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

    const auditTrail = new AuditTrailService({
      now: () => "2026-02-25T01:30:00.000Z",
    });
    const systemService = new SystemOperationsService({
      now: () => "2026-02-25T01:30:00.000Z",
      auditTrail,
    });

    const { run, report } = await runScheduledCleanupJob(
      coordinator,
      systemService,
      {
        operationId: "cleanup-1",
        mode: "dry-run",
        actorId: "ops-1",
        target: "out/v3/tmp",
      },
    );

    assert.equal(run.status, "completed");
    assert.equal(report?.status, "success");
    assert.equal(retryQueue.list("system-external").length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scheduled ingest failures are persisted in retry queue", async () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-ingest-jobs-"));
  try {
    let now = 2_070_000_000;
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

    const run = await runScheduledIngestJob(coordinator, "ingest-9", async () => {
      throw new Error("provider timeout");
    });

    assert.equal(run.status, "failed");
    const queued = retryQueue.list("ingest-external");
    assert.equal(queued.length, 1);
    assert.equal(queued[0]?.status, "pending");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
