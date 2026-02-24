import assert from "node:assert/strict";
import test from "node:test";

import { AdminOperationsService } from "../../../application/admin/admin-operations-service.ts";
import { OperationalTelemetryService } from "../../../application/observability/operational-telemetry-service.ts";
import { RequestSecurityPolicy } from "../../../application/security/request-security-policy.ts";
import { createAdminRouteHandlers } from "./admin-routes.ts";
import { parseSessionToken } from "../auth/session-context.ts";

const adminSession = parseSessionToken("admin:ops-user:token-1:operator");
const ownerSession = parseSessionToken("admin:owner-user:token-3:owner");
const userSession = parseSessionToken("user:end-user:token-2:picnic-user");

test("admin routes reject user sessions", () => {
  const service = new AdminOperationsService({
    now: () => "2026-02-24T23:30:00.000Z",
  });
  const handlers = createAdminRouteHandlers(service);

  const response = handlers.cleanup(userSession, {
    operationId: "cleanup-1",
    dryRun: true,
    targets: ["bronze"],
  });

  assert.equal(response.ok, false);
  assert.equal(response.error?.code, "FORBIDDEN_SESSION");
});

test("admin routes allow ingest/recompute/config/cleanup with admin session", () => {
  const service = new AdminOperationsService({
    now: () => "2026-02-24T23:30:00.000Z",
  });
  const handlers = createAdminRouteHandlers(service);

  const ingest = handlers.ingest(adminSession, {
    operationId: "ingest-1",
    weeks: [9],
    kcals: [1800],
    basePersons: [2],
  });
  assert.equal(ingest.ok, true);
  assert.equal(ingest.data?.operationType, "ingest");

  const recompute = handlers.recompute(adminSession, {
    operationId: "recompute-1",
    transformVersion: "silver-v1",
    week: 9,
    kcal: 1800,
    basePersons: 2,
  });
  assert.equal(recompute.ok, true);
  assert.equal(recompute.data?.operationType, "recompute");

  const config = handlers.configUpdate(adminSession, {
    operationId: "config-1",
    key: "PG_WEEK_URL_TEMPLATE",
    value: "https://example.invalid/{week}",
  });
  assert.equal(config.ok, true);
  assert.equal(config.data?.operationType, "config_update");
  assert.equal(service.listConfig().length, 1);

  const cleanup = handlers.cleanup(adminSession, {
    operationId: "cleanup-1",
    dryRun: true,
    targets: ["bronze", "silver-temp"],
  });
  assert.equal(cleanup.ok, true);
  assert.equal(cleanup.data?.operationType, "cleanup");
  assert.equal(cleanup.data?.status, "dry_run");

  const cutover = handlers.cutoverChecklist(adminSession, {
    operationId: "cutover-1",
    gates: [
      {
        gateId: "top1",
        label: "Top-1 coverage",
        metric: 0.73,
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
  assert.equal(cutover.ok, true);
  assert.equal(cutover.data?.operationType, "cutover_checklist");
  assert.equal(cutover.data?.details?.decision, "ready");
});

test("admin cutover checklist route validates payload and blocks when required gate fails", () => {
  const service = new AdminOperationsService({
    now: () => "2026-02-24T23:30:00.000Z",
  });
  const handlers = createAdminRouteHandlers(service);

  const invalid = handlers.cutoverChecklist(adminSession, {
    operationId: "cutover-invalid",
    gates: [
      {
        gateId: "bad-gate",
        label: "Bad gate",
        metric: 1,
      },
    ],
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error?.code, "INVALID_BODY");

  const blocked = handlers.cutoverChecklist(adminSession, {
    operationId: "cutover-blocked",
    gates: [
      {
        gateId: "top1",
        label: "Top-1 coverage",
        metric: 0.65,
        minValue: 0.7,
        required: true,
        rollbackOnFail: true,
      },
      {
        gateId: "manual-check",
        label: "Manual note",
        metric: 1,
        minValue: 1,
        required: false,
        rollbackOnFail: false,
      },
    ],
  });
  assert.equal(blocked.ok, true);
  assert.equal(blocked.data?.details?.decision, "blocked");
  assert.equal(blocked.data?.details?.rollbackRequired, true);
  assert.deepEqual(blocked.data?.details?.failedGateIds, ["top1"]);
});

test("admin routes enforce RBAC, rate limit, and WAF when security policy is enabled", () => {
  const service = new AdminOperationsService({
    now: () => "2026-02-24T23:30:00.000Z",
  });
  let now = 2_200_000_000;
  const telemetry = new OperationalTelemetryService();
  const securityPolicy = new RequestSecurityPolicy({
    telemetry,
    nowEpochSeconds: () => now,
    rateLimitWindowSeconds: 60,
    rateLimitMaxRequests: 1,
  });
  const handlers = createAdminRouteHandlers(service, {
    securityPolicy,
    telemetry,
    nowMs: () => now * 1000,
  });

  const forbiddenConfig = handlers.configUpdate(adminSession, {
    operationId: "config-owner-only",
    key: "PG_WEEK_URL_TEMPLATE",
    value: "https://example.invalid/{week}",
  });
  assert.equal(forbiddenConfig.ok, false);
  assert.equal(forbiddenConfig.error?.code, "FORBIDDEN_ROLE");

  const wafBlocked = handlers.cleanup(ownerSession, {
    operationId: "cleanup-waf",
    dryRun: true,
    targets: ["<script>alert(1)</script>"],
  });
  assert.equal(wafBlocked.ok, false);
  assert.equal(wafBlocked.error?.code, "WAF_BLOCKED");

  const ingestOne = handlers.ingest(ownerSession, {
    operationId: "ingest-one",
    weeks: [9],
    kcals: [1800],
    basePersons: [2],
  });
  assert.equal(ingestOne.ok, true);

  const ingestTwo = handlers.ingest(ownerSession, {
    operationId: "ingest-two",
    weeks: [9],
    kcals: [1800],
    basePersons: [2],
  });
  assert.equal(ingestTwo.ok, false);
  assert.equal(ingestTwo.error?.code, "RATE_LIMITED");

  const prometheus = telemetry.toPrometheusMetrics();
  assert.equal(prometheus.includes('menufit_http_requests_total{route="admin.ingest",outcome="rate_limited"} 1'), true);
  assert.equal(prometheus.includes('menufit_security_events_total{route="admin.cleanup",event="waf_blocked"} 1'), true);
});
