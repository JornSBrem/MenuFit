import assert from "node:assert/strict";
import test from "node:test";

import type { PicnicCartSyncAdapter } from "../../../integrations/picnic/cart-sync.ts";
import { CartSyncService } from "../../../application/cart/sync-service.ts";
import { createCartRouteHandlers } from "./cart-routes.ts";

test("cart sync route returns invalid body envelope for missing data", async () => {
  const handlers = createCartRouteHandlers(new CartSyncService());
  const response = await handlers.sync({
    idempotencyKey: "",
    weekPlanId: "",
    householdId: "",
    source: "user",
    items: [],
  });

  assert.equal(response.ok, false);
  assert.equal(response.error?.code, "INVALID_BODY");
});

test("cart sync route returns service error for user dry-run", async () => {
  const handlers = createCartRouteHandlers(new CartSyncService());
  const response = await handlers.sync({
    idempotencyKey: "idem-user-dry-run",
    weekPlanId: "weekplan-9",
    householdId: "household-1",
    source: "user",
    mode: "dry-run",
    items: [{ itemId: "prod-1", quantity: 1 }],
  });

  assert.equal(response.ok, false);
  assert.equal(response.error?.code, "DRY_RUN_FORBIDDEN");
});

test("cart sync route returns idempotent replay report on second call", async () => {
  let syncCalls = 0;
  const adapter: PicnicCartSyncAdapter = {
    async syncCart(request) {
      syncCalls += 1;
      return {
        syncedCount: request.items.length,
        failedCount: 0,
        externalCartId: "cart-42",
      };
    },
  };

  const service = new CartSyncService({
    adapter,
    now: () => "2026-02-24T23:10:00.000Z",
  });
  const handlers = createCartRouteHandlers(service);

  const payload = {
    idempotencyKey: "idem-42",
    weekPlanId: "weekplan-9",
    householdId: "household-1",
    source: "user" as const,
    mode: "execute" as const,
    items: [{ itemId: "prod-1", quantity: 1 }],
  };

  const first = await handlers.sync(payload);
  const second = await handlers.sync(payload);

  assert.equal(syncCalls, 1);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(first.data?.idempotentReplay, false);
  assert.equal(second.data?.idempotentReplay, true);
  assert.equal(first.data?.reportId, second.data?.reportId);
});
