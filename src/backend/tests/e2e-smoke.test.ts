import assert from "node:assert/strict";
import test from "node:test";

import { GoldWeekReadService } from "../application/gold/read-service.ts";
import { AuditTrailService } from "../application/audit/audit-trail-service.ts";
import { MatchingReviewService } from "../application/matching/review-service.ts";
import { CartSyncService } from "../application/cart/sync-service.ts";
import { SystemOperationsService } from "../application/system/system-operations-service.ts";
import { createWeekRouteHandlers } from "../interfaces/http/week/week-routes.ts";
import { createCartRouteHandlers } from "../interfaces/http/cart/cart-routes.ts";
import { createSystemRouteHandlers } from "../interfaces/http/system/system-routes.ts";
import { parseSessionToken } from "../interfaces/http/auth/session-context.ts";

test("e2e smoke: week -> match -> cart -> system operations", async () => {
  const auditTrail = new AuditTrailService({
    now: () => "2026-02-25T00:30:00.000Z",
  });

  const readService = new GoldWeekReadService();
  readService.upsert({
    weekPlan: {
      weekPlanId: "weekplan-9",
      year: 2026,
      week: 9,
      kcal: 1800,
      basePersons: 2,
      mealCount: 7,
      sourceObjectId: "bronze-week-9",
      transformVersion: "gold-v1",
      generatedAt: "2026-02-25T00:30:00.000Z",
    },
    groceries: [
      {
        canonicalName: "volkoren pasta",
        totalAmount: 250,
        unit: "g",
        requiresReview: false,
      },
      {
        canonicalName: "tomaat",
        totalAmount: 2,
        unit: "stuk",
        requiresReview: false,
      },
    ],
    groceryReconcile: [
      {
        canonicalName: "volkoren pasta",
        reconcileStatus: "matched",
      },
      {
        canonicalName: "tomaat",
        reconcileStatus: "matched",
      },
    ],
    matchStatus: {
      totalItems: 2,
      resolvedItems: 2,
      unresolvedItems: 0,
      coverageScore: 1,
    },
    cartPlan: {
      cartPlanId: "cartplan-9",
      weekPlanId: "weekplan-9",
      itemCount: 2,
      unresolvedCount: 0,
      generatedAt: "2026-02-25T00:30:00.000Z",
    },
  });

  const weekRoutes = createWeekRouteHandlers(readService);
  const summary = weekRoutes.summary({
    year: 2026,
    week: 9,
    kcal: 1800,
    basePersons: 2,
  });
  assert.equal(summary.ok, true);

  const matching = new MatchingReviewService({
    policy: {
      highConfidenceMin: 0.9,
      autoAcceptMin: 0.6,
      candidateMax: 5,
    },
    auditTrail,
  });
  const matchResult = matching.evaluate({
    itemId: "item-1",
    sourceRef: "week-9",
    query: "volkoren pasta",
    candidates: [
      { candidateId: "cand-1", label: "volkoren pasta" },
      { candidateId: "cand-2", label: "witte rijst" },
    ],
    path: "picnic",
  });
  assert.equal(matchResult.decision, "high");

  const cart = new CartSyncService({
    now: () => "2026-02-25T00:30:00.000Z",
    auditTrail,
  });
  const cartRoutes = createCartRouteHandlers(cart);
  const cartReport = await cartRoutes.sync({
    idempotencyKey: "smoke-week-9",
    weekPlanId: "weekplan-9",
    householdId: "household-smoke",
    source: "user",
    mode: "execute",
    items: [{ itemId: "cand-1", quantity: 1 }],
  });
  assert.equal(cartReport.ok, true);
  assert.equal(cartReport.data?.status, "synced");

  const system = new SystemOperationsService({
    now: () => "2026-02-25T00:30:00.000Z",
    auditTrail,
  });
  const systemRoutes = createSystemRouteHandlers(system);
  const adminSession = parseSessionToken("admin:ops-user:token-smoke:owner");
  const backupReport = systemRoutes.backup(adminSession, {
    operationId: "backup-smoke",
    mode: "dry-run",
    target: "db/v3.sqlite",
  });
  assert.equal(backupReport.ok, true);
  assert.equal(backupReport.data?.mode, "dry-run");
  assert.equal(systemRoutes.jobs().data?.length, 1);

  const matchingEvents = auditTrail.list({ category: "matching" });
  const syncEvents = auditTrail.list({ category: "sync" });
  const systemEvents = auditTrail.list({ category: "system" });
  assert.equal(matchingEvents.length, 1);
  assert.equal(syncEvents.length, 1);
  assert.equal(systemEvents.length, 1);
});
