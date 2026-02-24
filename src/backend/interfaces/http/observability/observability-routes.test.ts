import assert from "node:assert/strict";
import test from "node:test";

import { OperationalTelemetryService } from "../../../application/observability/operational-telemetry-service.ts";
import { parseSessionToken } from "../auth/session-context.ts";
import { createObservabilityRouteHandlers } from "./observability-routes.ts";

const adminSession = parseSessionToken("admin:ops-user:token-obs:owner");
const userSession = parseSessionToken("user:end-user:token-obs:picnic-user");

test("observability routes require admin session and return snapshot + metrics", () => {
  const telemetry = new OperationalTelemetryService();
  telemetry.recordRequest({
    routeKey: "admin.ingest",
    outcome: "success",
    durationMs: 12,
  });
  const handlers = createObservabilityRouteHandlers(telemetry);

  const forbidden = handlers.snapshot(userSession);
  assert.equal(forbidden.ok, false);
  assert.equal(forbidden.error?.code, "FORBIDDEN_SESSION");

  const snapshot = handlers.snapshot(adminSession);
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.data?.totals.requests, 1);

  const metrics = handlers.metrics(adminSession);
  assert.equal(metrics.ok, true);
  assert.equal(metrics.data?.contentType, "text/plain; version=0.0.4");
  assert.equal(metrics.data?.body.includes("menufit_http_requests_total"), true);
});
