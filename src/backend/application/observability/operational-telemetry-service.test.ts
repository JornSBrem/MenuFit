import assert from "node:assert/strict";
import test from "node:test";

import { OperationalTelemetryService } from "./operational-telemetry-service.ts";

test("operational telemetry service builds dashboard snapshot and release-gate input", () => {
  const telemetry = new OperationalTelemetryService({
    now: () => "2026-02-25T02:00:00.000Z",
  });

  telemetry.recordRequest({
    routeKey: "admin.ingest",
    outcome: "success",
    durationMs: 15,
  });
  telemetry.recordRequest({
    routeKey: "admin.ingest",
    outcome: "client_error",
    durationMs: 5,
  });
  telemetry.recordRequest({
    routeKey: "system.restore",
    outcome: "forbidden",
    durationMs: 2,
  });
  telemetry.recordSecurityEvent({
    routeKey: "system.restore",
    eventType: "rbac_forbidden",
  });

  const snapshot = telemetry.getSnapshot();
  assert.equal(snapshot.generatedAt, "2026-02-25T02:00:00.000Z");
  assert.equal(snapshot.totals.requests, 3);
  assert.equal(snapshot.totals.errors, 1);
  assert.equal(snapshot.totals.blocked, 1);
  assert.equal(snapshot.routes.length, 2);
  assert.equal(snapshot.security.length, 1);

  const gate = telemetry.buildReleaseGateInput();
  assert.equal(gate.totalRequests, 3);
  assert.equal(gate.successRate, 1 / 3);
  assert.equal(gate.errorRate, 1 / 3);
  assert.equal(gate.blockedRate, 1 / 3);
});

test("operational telemetry exports prometheus text with route and security counters", () => {
  const telemetry = new OperationalTelemetryService();
  telemetry.recordRequest({
    routeKey: "admin.cleanup",
    outcome: "rate_limited",
    durationMs: 1,
  });
  telemetry.recordSecurityEvent({
    routeKey: "admin.cleanup",
    eventType: "rate_limited",
  });

  const metrics = telemetry.toPrometheusMetrics();
  assert.equal(metrics.includes('menufit_http_requests_total{route="admin.cleanup",outcome="rate_limited"} 1'), true);
  assert.equal(metrics.includes('menufit_security_events_total{route="admin.cleanup",event="rate_limited"} 1'), true);
  assert.equal(metrics.includes("menufit_release_gate_blocked_rate"), true);
});
