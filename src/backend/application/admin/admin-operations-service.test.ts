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

test("admin cutover checklist reports ready or blocked decisions deterministically", () => {
  const service = new AdminOperationsService({
    now: () => "2026-02-25T01:10:00.000Z",
  });

  const ready = service.runCutoverChecklist({
    operationId: "cutover-ready",
    performedBy: "admin-1",
    gates: [
      {
        gateId: "top1",
        label: "Top-1",
        metric: 0.75,
        minValue: 0.7,
        required: true,
        rollbackOnFail: true,
      },
      {
        gateId: "review-rate",
        label: "Review rate",
        metric: 0.2,
        maxValue: 0.25,
        required: true,
        rollbackOnFail: true,
      },
    ],
  });
  assert.equal(ready.operationType, "cutover_checklist");
  assert.equal(ready.status, "completed");
  assert.equal(ready.details?.decision, "ready");
  assert.equal(ready.details?.rollbackRequired, false);

  const blocked = service.runCutoverChecklist({
    operationId: "cutover-blocked",
    performedBy: "admin-1",
    gates: [
      {
        gateId: "top1",
        label: "Top-1",
        metric: 0.62,
        minValue: 0.7,
        required: true,
        rollbackOnFail: true,
      },
      {
        gateId: "optional-note",
        label: "Optional note",
        metric: 0,
        maxValue: 0,
        required: false,
        rollbackOnFail: false,
      },
    ],
  });
  assert.equal(blocked.details?.decision, "blocked");
  assert.equal(blocked.details?.rollbackRequired, true);
  assert.deepEqual(blocked.details?.failedGateIds, ["top1"]);
});
