import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";
import { AuditTrailService } from "./audit-trail-service.ts";

test("audit trail records events and redacts sensitive fields", () => {
  const service = new AuditTrailService({
    now: () => "2026-02-24T23:59:00.000Z",
  });

  const event = service.record({
    category: "sync",
    action: "cart_sync",
    resourceId: "idem-1",
    actorId: "user",
    outcome: "success",
    details: {
      token: "raw-token",
      nested: {
        authorization: "Bearer abc",
      },
      safeField: "ok",
    },
  });

  assert.equal(event.eventId, "audit-1");
  assert.equal(event.createdAt, "2026-02-24T23:59:00.000Z");

  const stored = service.list();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].details?.token, "***REDACTED***");
  assert.equal((stored[0].details?.nested as Record<string, unknown>).authorization, "***REDACTED***");
  assert.equal(stored[0].details?.safeField, "ok");
});

test("audit trail persists events across service restarts", () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-audit-"));
  try {
    const stateStore = new PersistentStateStore(join(dir, "state.json"));
    const first = new AuditTrailService({
      now: () => "2026-02-25T00:50:00.000Z",
      stateStore,
    });
    first.record({
      category: "config",
      action: "config_update",
      resourceId: "LLM_PROVIDER",
      actorId: "admin-1",
      outcome: "success",
    });

    const second = new AuditTrailService({
      now: () => "2026-02-25T01:00:00.000Z",
      stateStore,
    });
    const events = second.list();
    assert.equal(events.length, 1);
    assert.equal(events[0].action, "config_update");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
