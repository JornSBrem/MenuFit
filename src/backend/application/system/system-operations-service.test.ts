import assert from "node:assert/strict";
import test from "node:test";

import { SystemOperationsService } from "./system-operations-service.ts";

test("system service exposes health diagnostics and job status", () => {
  const service = new SystemOperationsService({
    now: () => "2026-02-25T00:00:00.000Z",
  });

  const health = service.getHealth();
  assert.equal(health.status, "ok");

  const diagnostics = service.getDiagnostics();
  assert.equal(diagnostics.totalJobs, 0);
  assert.equal(diagnostics.reportsGenerated, 0);
});

test("backup/restore/cleanup support dry-run and execute with logs", () => {
  const service = new SystemOperationsService({
    now: () => "2026-02-25T00:00:00.000Z",
  });

  const backup = service.runBackup({
    operationId: "backup-1",
    mode: "dry-run",
    actorId: "admin-1",
    target: "db/v3.sqlite",
  });
  assert.equal(backup.mode, "dry-run");
  assert.equal(backup.status, "success");
  assert.equal(backup.logs.length > 0, true);

  const restore = service.runRestore({
    operationId: "restore-1",
    mode: "execute",
    actorId: "admin-1",
    target: "backups/latest",
  });
  assert.equal(restore.mode, "execute");
  assert.equal(restore.status, "success");

  const cleanup = service.runCleanup({
    operationId: "cleanup-1",
    mode: "dry-run",
    actorId: "admin-1",
    target: "out/v3/bronze-temp",
  });
  assert.equal(cleanup.operationType, "cleanup");

  const jobs = service.listJobs();
  assert.equal(jobs.length, 3);
  assert.equal(jobs.every((job) => job.status === "completed"), true);
});
