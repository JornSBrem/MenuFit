import assert from "node:assert/strict";
import test from "node:test";

import { OperationalTelemetryService } from "../observability/operational-telemetry-service.ts";
import { RequestSecurityPolicy } from "./request-security-policy.ts";

test("request security policy enforces owner-only route RBAC", () => {
  const policy = new RequestSecurityPolicy();
  const forbidden = policy.authorize({
    routeKey: "admin.cutoverChecklist",
    actorId: "ops-1",
    actorRole: "operator",
    requiredRole: "owner",
  });
  assert.equal(forbidden.ok, false);
  assert.equal(forbidden.error?.code, "FORBIDDEN_ROLE");
});

test("request security policy enforces rate limit window", () => {
  let now = 2_100_000_000;
  const policy = new RequestSecurityPolicy({
    nowEpochSeconds: () => now,
    rateLimitWindowSeconds: 60,
    rateLimitMaxRequests: 2,
  });

  const first = policy.authorize({
    routeKey: "system.cleanup",
    actorId: "ops-1",
    actorRole: "owner",
    requiredRole: "operator",
  });
  assert.equal(first.ok, true);

  const second = policy.authorize({
    routeKey: "system.cleanup",
    actorId: "ops-1",
    actorRole: "owner",
    requiredRole: "operator",
  });
  assert.equal(second.ok, true);

  const third = policy.authorize({
    routeKey: "system.cleanup",
    actorId: "ops-1",
    actorRole: "owner",
    requiredRole: "operator",
  });
  assert.equal(third.ok, false);
  assert.equal(third.error?.code, "RATE_LIMITED");

  now += 61;
  const afterWindow = policy.authorize({
    routeKey: "system.cleanup",
    actorId: "ops-1",
    actorRole: "owner",
    requiredRole: "operator",
  });
  assert.equal(afterWindow.ok, true);
});

test("request security policy blocks waf patterns and emits security telemetry", () => {
  const telemetry = new OperationalTelemetryService();
  const policy = new RequestSecurityPolicy({
    telemetry,
  });

  const blocked = policy.authorize({
    routeKey: "admin.configUpdate",
    actorId: "ops-1",
    actorRole: "owner",
    requiredRole: "owner",
    payload: {
      value: "<script>alert(1)</script>",
    },
  });

  assert.equal(blocked.ok, false);
  assert.equal(blocked.error?.code, "WAF_BLOCKED");
  const metrics = telemetry.toPrometheusMetrics();
  assert.equal(metrics.includes('menufit_security_events_total{route="admin.configUpdate",event="waf_blocked"} 1'), true);
});
