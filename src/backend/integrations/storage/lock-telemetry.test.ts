import assert from "node:assert/strict";
import test from "node:test";

import { LockTelemetryCollector } from "./lock-telemetry.ts";

test("lock telemetry collector exports prometheus counters", () => {
  const collector = new LockTelemetryCollector();
  collector.record({ backend: "file", eventType: "acquired" });
  collector.record({ backend: "file", eventType: "acquired" });
  collector.record({ backend: "redis", eventType: "timeout" });

  const metrics = collector.toPrometheusMetrics();
  assert.equal(
    metrics.includes('menufit_lock_events_total{backend="file",event="acquired"} 2'),
    true,
  );
  assert.equal(
    metrics.includes('menufit_lock_events_total{backend="redis",event="timeout"} 1'),
    true,
  );
});
