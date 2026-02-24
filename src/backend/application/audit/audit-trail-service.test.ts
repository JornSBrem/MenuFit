import assert from "node:assert/strict";
import test from "node:test";

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
