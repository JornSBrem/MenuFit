import assert from "node:assert/strict";
import test from "node:test";

import { AuditTrailService } from "../audit/audit-trail-service.ts";
import { AdminOperationsService } from "./admin-operations-service.ts";

test("admin operations write audit events for critical mutations", () => {
  const auditTrail = new AuditTrailService({
    now: () => "2026-02-25T01:00:00.000Z",
  });
  const service = new AdminOperationsService({
    now: () => "2026-02-25T01:00:00.000Z",
    auditTrail,
  });

  service.runIngest({
    operationId: "ingest-1",
    performedBy: "admin-1",
    weeks: [9],
    kcals: [1800],
    basePersons: [2],
  });
  service.updateConfig({
    operationId: "config-1",
    performedBy: "admin-1",
    key: "FEATURE_FLAGS_JSON",
    value: { matching: true },
  });
  service.runCleanup({
    operationId: "cleanup-1",
    performedBy: "admin-1",
    dryRun: true,
    targets: ["out/v3/tmp"],
  });

  const adminEvents = auditTrail.list({ category: "admin" });
  const configEvents = auditTrail.list({ category: "config" });
  assert.equal(adminEvents.length, 2);
  assert.equal(configEvents.length, 1);
  assert.equal(adminEvents[0].action, "ingest");
  assert.equal(configEvents[0].action, "config_update");
  assert.equal(adminEvents[1].outcome, "dry_run");
});
