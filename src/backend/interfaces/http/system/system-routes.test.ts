import assert from "node:assert/strict";
import test from "node:test";

import { SystemOperationsService } from "../../../application/system/system-operations-service.ts";
import { createSystemRouteHandlers } from "./system-routes.ts";
import { parseSessionToken } from "../auth/session-context.ts";

const adminSession = parseSessionToken("admin:ops-user:token-admin:owner");
const userSession = parseSessionToken("user:end-user:token-user:picnic-user");

test("system routes expose health diagnostics and job status", () => {
  const service = new SystemOperationsService({
    now: () => "2026-02-25T00:10:00.000Z",
  });
  const handlers = createSystemRouteHandlers(service);

  const health = handlers.health();
  assert.equal(health.ok, true);
  assert.equal(health.data?.status, "ok");

  const diagnostics = handlers.diagnostics();
  assert.equal(diagnostics.ok, true);
  assert.equal(diagnostics.data?.totalJobs, 0);

  const jobs = handlers.jobs();
  assert.equal(jobs.ok, true);
  assert.equal(jobs.data?.length, 0);
});

test("system mutating operations are admin-only and support dry-run/execute", () => {
  const service = new SystemOperationsService({
    now: () => "2026-02-25T00:10:00.000Z",
  });
  const handlers = createSystemRouteHandlers(service);

  const forbidden = handlers.backup(userSession, {
    operationId: "backup-1",
    mode: "dry-run",
    target: "db/v3.sqlite",
  });
  assert.equal(forbidden.ok, false);
  assert.equal(forbidden.error?.code, "FORBIDDEN_SESSION");

  const backup = handlers.backup(adminSession, {
    operationId: "backup-2",
    mode: "dry-run",
    target: "db/v3.sqlite",
  });
  assert.equal(backup.ok, true);
  assert.equal(backup.data?.mode, "dry-run");

  const cleanup = handlers.cleanup(adminSession, {
    operationId: "cleanup-2",
    mode: "execute",
    target: "out/v3/tmp",
  });
  assert.equal(cleanup.ok, true);
  assert.equal(cleanup.data?.operationType, "cleanup");
  assert.equal((cleanup.data?.logs.length ?? 0) > 0, true);

  const jobsAfter = handlers.jobs();
  assert.equal(jobsAfter.data?.length, 2);
});
