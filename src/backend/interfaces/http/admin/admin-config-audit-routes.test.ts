import assert from "node:assert/strict";
import test from "node:test";

import { AuditTrailService } from "../../../application/audit/audit-trail-service.ts";
import { AdminOperationsService } from "../../../application/admin/admin-operations-service.ts";
import type { AdminSessionContext, UserSessionContext } from "../auth/session-context.ts";
import { handleListConfigAudit } from "./admin-config-audit-routes.ts";

const adminSession = (): AdminSessionContext => ({
  sessionKind: "admin",
  subjectId: "admin-1",
  tokenId: "tok-1",
  adminRole: "operator",
});

const userSession = (): UserSessionContext => ({
  sessionKind: "user",
  subjectId: "user-1",
  tokenId: "tok-1",
  picnicAccountId: "picnic-1",
});

const makeServices = () => {
  const auditTrail = new AuditTrailService({ now: () => "2026-02-25T10:00:00.000Z" });
  const operations = new AdminOperationsService({ now: () => "2026-02-25T10:00:00.000Z", auditTrail });
  return { auditTrail, operations };
};

// --- Auth checks ---

test("handleListConfigAudit rejects user session", () => {
  const { auditTrail } = makeServices();
  const result = handleListConfigAudit(auditTrail, userSession());
  assert.ok(!result.ok);
  assert.equal(result.error?.code, "FORBIDDEN_SESSION");
});

// --- List config audit ---

test("handleListConfigAudit returns empty list when no config changes", () => {
  const { auditTrail } = makeServices();
  const result = handleListConfigAudit(auditTrail, adminSession());
  assert.ok(result.ok);
  assert.deepEqual(result.data, []);
});

test("handleListConfigAudit returns config events after updateConfig", () => {
  const { auditTrail, operations } = makeServices();
  operations.updateConfig({ operationId: "op-1", performedBy: "admin-1", key: "featureX", value: true });

  const result = handleListConfigAudit(auditTrail, adminSession());
  assert.ok(result.ok);
  assert.equal(result.data?.length, 1);
  assert.equal(result.data![0]!.category, "config");
  assert.equal(result.data![0]!.action, "config_update");
  assert.equal(result.data![0]!.actorId, "admin-1");
});

test("handleListConfigAudit records before/after context in details", () => {
  const { auditTrail, operations } = makeServices();
  operations.updateConfig({ operationId: "op-1", performedBy: "admin-1", key: "featureX", value: false });
  operations.updateConfig({ operationId: "op-2", performedBy: "admin-1", key: "featureX", value: true });

  const result = handleListConfigAudit(auditTrail, adminSession());
  assert.ok(result.ok);
  assert.equal(result.data?.length, 2);

  const first = result.data![0]!.details as Record<string, unknown>;
  assert.equal(first["key"], "featureX");
  assert.equal(first["before"], null);
  assert.equal(first["after"], false);

  const second = result.data![1]!.details as Record<string, unknown>;
  assert.equal(second["key"], "featureX");
  assert.equal(second["before"], false);
  assert.equal(second["after"], true);
});

test("handleListConfigAudit does not include non-config audit events", () => {
  const { auditTrail, operations } = makeServices();
  operations.runIngest({ operationId: "op-1", performedBy: "admin-1", weeks: [8], kcals: [2000], basePersons: [4] });
  operations.updateConfig({ operationId: "op-2", performedBy: "admin-1", key: "k", value: 1 });

  const result = handleListConfigAudit(auditTrail, adminSession());
  assert.ok(result.ok);
  assert.equal(result.data?.length, 1);
  assert.equal(result.data![0]!.category, "config");
});

test("handleListConfigAudit filters by actorId", () => {
  const { auditTrail, operations } = makeServices();
  operations.updateConfig({ operationId: "op-1", performedBy: "admin-1", key: "k1", value: 1 });
  operations.updateConfig({ operationId: "op-2", performedBy: "admin-2", key: "k2", value: 2 });

  const result = handleListConfigAudit(auditTrail, adminSession(), { actorId: "admin-1" });
  assert.ok(result.ok);
  assert.equal(result.data?.length, 1);
  assert.equal(result.data![0]!.actorId, "admin-1");
});

test("handleListConfigAudit filters by configKey", () => {
  const { auditTrail, operations } = makeServices();
  operations.updateConfig({ operationId: "op-1", performedBy: "admin-1", key: "featureX", value: true });
  operations.updateConfig({ operationId: "op-2", performedBy: "admin-1", key: "featureY", value: false });

  const result = handleListConfigAudit(auditTrail, adminSession(), { configKey: "featureX" });
  assert.ok(result.ok);
  assert.equal(result.data?.length, 1);
  const details = result.data![0]!.details as Record<string, unknown>;
  assert.equal(details["key"], "featureX");
});

test("handleListConfigAudit combines actorId and configKey filters", () => {
  const { auditTrail, operations } = makeServices();
  operations.updateConfig({ operationId: "op-1", performedBy: "admin-1", key: "featureX", value: true });
  operations.updateConfig({ operationId: "op-2", performedBy: "admin-2", key: "featureX", value: false });
  operations.updateConfig({ operationId: "op-3", performedBy: "admin-1", key: "featureY", value: 42 });

  const result = handleListConfigAudit(auditTrail, adminSession(), { actorId: "admin-1", configKey: "featureX" });
  assert.ok(result.ok);
  assert.equal(result.data?.length, 1);
  assert.equal(result.data![0]!.actorId, "admin-1");
});

test("handleListConfigAudit returns events in insertion order", () => {
  const { auditTrail, operations } = makeServices();
  operations.updateConfig({ operationId: "op-1", performedBy: "admin-1", key: "a", value: 1 });
  operations.updateConfig({ operationId: "op-2", performedBy: "admin-1", key: "b", value: 2 });
  operations.updateConfig({ operationId: "op-3", performedBy: "admin-1", key: "c", value: 3 });

  const result = handleListConfigAudit(auditTrail, adminSession());
  assert.ok(result.ok);
  assert.equal(result.data?.length, 3);

  const keys = result.data!.map((e) => (e.details as Record<string, unknown>)["key"]);
  assert.deepEqual(keys, ["a", "b", "c"]);
});
