import assert from "node:assert/strict";
import test from "node:test";

import type { PicnicCartSyncAdapter } from "../../integrations/picnic/cart-sync.ts";
import { CartSyncError, CartSyncService } from "./sync-service.ts";

const baseRequest = {
  idempotencyKey: "idem-1",
  weekPlanId: "weekplan-9",
  householdId: "household-1",
  source: "user" as const,
  mode: "execute" as const,
  items: [
    { itemId: "prod-1", quantity: 2 },
    { itemId: "prod-2", quantity: 1 },
  ],
};

test("sync is idempotent and returns replay report on duplicate idempotency key", async () => {
  let syncCalls = 0;
  const adapter: PicnicCartSyncAdapter = {
    async syncCart(request) {
      syncCalls += 1;
      return {
        syncedCount: request.items.length,
        failedCount: 0,
        externalCartId: "cart-123",
      };
    },
  };

  const service = new CartSyncService({
    adapter,
    now: () => "2026-02-24T23:00:00.000Z",
  });

  const first = await service.sync(baseRequest);
  const second = await service.sync(baseRequest);

  assert.equal(syncCalls, 1);
  assert.equal(first.idempotentReplay, false);
  assert.equal(second.idempotentReplay, true);
  assert.equal(first.reportId, second.reportId);
  assert.equal(second.status, "synced");
});

test("dry-run is blocked for user flow", async () => {
  const service = new CartSyncService();

  await assert.rejects(
    () =>
      service.sync({
        ...baseRequest,
        mode: "dry-run",
      }),
    (error: unknown) => {
      assert.ok(error instanceof CartSyncError);
      assert.equal(error.code, "DRY_RUN_FORBIDDEN");
      return true;
    },
  );
});

test("dry-run works in admin flow and does not call adapter", async () => {
  let syncCalls = 0;
  const adapter: PicnicCartSyncAdapter = {
    async syncCart() {
      syncCalls += 1;
      return {
        syncedCount: 0,
        failedCount: 0,
      };
    },
  };

  const service = new CartSyncService({
    adapter,
    now: () => "2026-02-24T23:00:00.000Z",
  });

  const report = await service.sync({
    ...baseRequest,
    idempotencyKey: "idem-admin-dry-run",
    source: "admin",
    mode: "dry-run",
  });

  assert.equal(syncCalls, 0);
  assert.equal(report.status, "dry_run");
  assert.equal(report.idempotentReplay, false);
  assert.equal(report.message.includes("Dry-run"), true);
});
