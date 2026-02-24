import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createDefaultRuntimeConfig } from "../../shared/config/index.ts";
import { AuditTrailService } from "../application/audit/audit-trail-service.ts";
import { CartSyncService } from "../application/cart/sync-service.ts";
import { GoldWeekReadService } from "../application/gold/read-service.ts";
import { HouseholdService } from "../application/household/household-service.ts";
import { MatchWorkflowService } from "../application/matching/match-workflow-service.ts";
import { MatchingReviewService } from "../application/matching/review-service.ts";
import { SystemOperationsService } from "../application/system/system-operations-service.ts";
import { parseSessionToken } from "../interfaces/http/auth/session-context.ts";
import { createCartRouteHandlers } from "../interfaces/http/cart/cart-routes.ts";
import { createHouseholdRouteHandlers } from "../interfaces/http/household/household-routes.ts";
import { createMatchRouteHandlers } from "../interfaces/http/match/match-routes.ts";
import { createSystemRouteHandlers } from "../interfaces/http/system/system-routes.ts";
import { createWeekRouteHandlers } from "../interfaces/http/week/week-routes.ts";
import { PersistentStateStore } from "../integrations/storage/persistent-state-store.ts";

test("e2e smoke: household -> week -> match -> cart -> system operations", async () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-e2e-"));
  try {
    const stateStore = new PersistentStateStore(join(dir, "state.json"));
    const auditTrail = new AuditTrailService({
      now: () => "2026-02-25T00:30:00.000Z",
    });

    const householdService = new HouseholdService({
      now: () => "2026-02-25T00:30:00.000Z",
      stateStore,
    });
    const householdRoutes = createHouseholdRouteHandlers(householdService);
    const headSession = parseSessionToken("user:head-smoke:token-head:picnic-head");
    const memberSession = parseSessionToken("user:member-smoke:token-member:picnic-member");

    const householdBootstrap = householdRoutes.bootstrap(headSession);
    assert.equal(householdBootstrap.ok, true);

    const householdId = householdBootstrap.data?.household?.householdId;
    assert.equal(householdId, "household-1");

    const invite = householdRoutes.invite(headSession, {
      householdId: householdId ?? "",
      invitedUserId: "member-smoke",
    });
    assert.equal(invite.ok, true);

    const accept = householdRoutes.accept(memberSession, {
      invitationId: invite.data?.invitationId ?? "",
    });
    assert.equal(accept.ok, true);
    assert.equal(accept.data?.household.householdId, householdId);

    const rehydratedHouseholdService = new HouseholdService({
      now: () => "2026-02-25T00:31:00.000Z",
      stateStore,
    });
    assert.equal(
      rehydratedHouseholdService.getHouseholdForUser("member-smoke")?.householdId,
      householdId,
    );

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
    const derivedGroceries = weekRoutes.groceries({
      year: 2026,
      week: 9,
      kcal: 1700,
      basePersons: 2,
    });
    assert.equal(derivedGroceries.ok, true);
    assert.equal(derivedGroceries.data?.weekPlanId, "weekplan-9:kcal-1700");
    assert.equal(derivedGroceries.data?.groceries[0]?.totalAmount, 236.111);

    const matchingReview = new MatchingReviewService({
      policy: {
        highConfidenceMin: 0.95,
        autoAcceptMin: 0.8,
        candidateMax: 5,
      },
      auditTrail,
    });
    const matchingWorkflow = new MatchWorkflowService({
      reviewService: matchingReview,
      configStore: createDefaultRuntimeConfig({
        LLM_PROVIDER: "openai",
        LLM_BASE_URL: "https://api.openai.com/v1",
        LLM_API_KEY: "test-key",
        LLM_API_VERSION: "2024-10-21",
        LLM_MODEL: "gpt-4o-mini",
      }),
      fetchImpl: (async () =>
        ({
          ok: true,
          status: 200,
          async json() {
            return {
              output_text: '{"candidateId":"cand-1","note":"best lexical fit"}',
            };
          },
        }) as Response) as typeof fetch,
    });
    const matchRoutes = createMatchRouteHandlers(matchingWorkflow);
    const matchResult = await matchRoutes.evaluate({
      itemId: "item-1",
      sourceRef: "week-9",
      query: "volkoren pasta",
      candidates: [
        { candidateId: "cand-1", label: "volkoren spaghetti", pathBonus: 0.05 },
        { candidateId: "cand-2", label: "witte rijst" },
      ],
      path: "picnic",
      finishPass: {
        enabled: true,
        autoApply: true,
        actorId: "llm-smoke",
      },
    });
    assert.equal(matchResult.ok, true);
    assert.equal(matchResult.data?.finishPass.attempted, true);
    assert.equal(matchResult.data?.finishPass.suggestedCandidateId, "cand-1");
    assert.equal(matchResult.data?.finishPass.appliedReviewAction?.queueItem.status, "mapped");

    const cart = new CartSyncService({
      now: () => "2026-02-25T00:30:00.000Z",
      auditTrail,
    });
    const cartRoutes = createCartRouteHandlers(cart);
    const cartReport = await cartRoutes.sync({
      idempotencyKey: "smoke-week-9",
      weekPlanId: "weekplan-9",
      householdId: householdId ?? "household-smoke",
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
    assert.equal(matchingEvents.length, 2);
    assert.equal(syncEvents.length, 1);
    assert.equal(systemEvents.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
