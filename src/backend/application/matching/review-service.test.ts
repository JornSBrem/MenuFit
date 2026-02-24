import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";
import { AuditTrailService } from "../audit/audit-trail-service.ts";
import type { SharedMatchCandidate } from "../../domain/matching/shared-core.ts";
import { MatchingReviewService } from "./review-service.ts";

const HIGH_CANDIDATES: SharedMatchCandidate[] = [
  { candidateId: "cand-exact", label: "volkoren pasta" },
  { candidateId: "cand-other", label: "witte rijst" },
];

test("evaluate uses central thresholds for high/medium/low decisions", () => {
  const service = new MatchingReviewService({
    policy: {
      highConfidenceMin: 0.95,
      autoAcceptMin: 0.45,
      candidateMax: 10,
    },
    now: () => "2026-02-24T22:00:00.000Z",
  });

  const highResult = service.evaluate({
    itemId: "item-high",
    sourceRef: "week:9:item:high",
    query: "volkoren pasta",
    candidates: HIGH_CANDIDATES,
    path: "reconcile",
  });
  assert.equal(highResult.decision, "high");
  assert.equal(highResult.queuedForReview, false);

  const mediumResult = service.evaluate({
    itemId: "item-medium",
    sourceRef: "week:9:item:medium",
    query: "volkoren pasta",
    candidates: [{ candidateId: "cand-medium", label: "volkoren spaghetti" }],
    path: "reconcile",
  });
  assert.equal(mediumResult.decision, "medium");
  assert.equal(mediumResult.queuedForReview, true);

  const lowResult = service.evaluate({
    itemId: "item-low",
    sourceRef: "week:9:item:low",
    query: "volkoren pasta",
    candidates: [{ candidateId: "cand-low", label: "witte rijst" }],
    path: "reconcile",
  });
  assert.equal(lowResult.decision, "low");
  assert.equal(lowResult.queuedForReview, true);

  assert.deepEqual(
    service.listQueueItems().map((item) => item.itemId),
    ["item-low", "item-medium"],
  );
});

test("review actions map/skip/defer write audit and overrides", () => {
  const service = new MatchingReviewService({
    policy: {
      highConfidenceMin: 0.95,
      autoAcceptMin: 0.7,
      candidateMax: 10,
    },
    now: () => "2026-02-24T22:00:00.000Z",
  });

  const lowCandidate = [{ candidateId: "cand-low", label: "witte rijst" }];

  service.evaluate({
    itemId: "queue-map",
    sourceRef: "week:9:item:map",
    query: "volkoren pasta",
    candidates: lowCandidate,
    path: "reconcile",
  });
  service.evaluate({
    itemId: "queue-skip",
    sourceRef: "week:9:item:skip",
    query: "volkoren pasta",
    candidates: lowCandidate,
    path: "reconcile",
  });
  service.evaluate({
    itemId: "queue-defer",
    sourceRef: "week:9:item:defer",
    query: "volkoren pasta",
    candidates: lowCandidate,
    path: "reconcile",
  });

  assert.throws(
    () =>
      service.applyReviewAction({
        itemId: "queue-map",
        action: "map",
        actorId: "admin-1",
      }),
    /requires candidateId/,
  );

  service.applyReviewAction({
    itemId: "queue-map",
    action: "map",
    candidateId: "cand-fixed",
    actorId: "admin-1",
    note: "mapped by operator",
  });
  service.applyReviewAction({
    itemId: "queue-skip",
    action: "skip",
    actorId: "admin-2",
  });
  service.applyReviewAction({
    itemId: "queue-defer",
    action: "defer",
    actorId: "admin-3",
    note: "needs product sync refresh",
  });

  const overrides = service.listOverrides();
  assert.equal(overrides.length, 3);
  assert.deepEqual(
    overrides.map((row) => row.action),
    ["map", "skip", "defer"],
  );

  const reviewAuditEvents = service
    .listAuditTrail()
    .filter((event) => event.eventType === "review_action");
  assert.equal(reviewAuditEvents.length, 3);
  assert.deepEqual(
    reviewAuditEvents.map((event) => event.action),
    ["map", "skip", "defer"],
  );

  const queueStatuses = new Map(service.listQueueItems().map((row) => [row.itemId, row.status]));
  assert.equal(queueStatuses.get("queue-map"), "mapped");
  assert.equal(queueStatuses.get("queue-skip"), "skipped");
  assert.equal(queueStatuses.get("queue-defer"), "deferred");
});

test("matching service writes central audit records for decisions and review actions", () => {
  const centralAudit = new AuditTrailService({
    now: () => "2026-02-24T22:00:00.000Z",
  });
  const service = new MatchingReviewService({
    policy: {
      highConfidenceMin: 0.95,
      autoAcceptMin: 0.7,
      candidateMax: 10,
    },
    now: () => "2026-02-24T22:00:00.000Z",
    auditTrail: centralAudit,
  });

  service.evaluate({
    itemId: "queue-1",
    sourceRef: "week:9:item:queue-1",
    query: "volkoren pasta",
    candidates: [{ candidateId: "cand-low", label: "witte rijst" }],
    path: "reconcile",
  });
  service.applyReviewAction({
    itemId: "queue-1",
    action: "skip",
    actorId: "admin-ops",
  });

  const events = centralAudit.list({ category: "matching" });
  assert.equal(events.length, 2);
  assert.equal(events[0].action, "decision");
  assert.equal(events[1].action, "review_action");
});

test("matching queue and overrides persist across service restarts", () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-match-"));
  try {
    const stateStore = new PersistentStateStore(join(dir, "state.json"));

    const first = new MatchingReviewService({
      policy: {
        highConfidenceMin: 0.95,
        autoAcceptMin: 0.8,
        candidateMax: 10,
      },
      now: () => "2026-02-25T00:40:00.000Z",
      stateStore,
    });

    first.evaluate({
      itemId: "persist-item",
      sourceRef: "week:9:item:persist",
      query: "volkoren pasta",
      candidates: [{ candidateId: "cand-low", label: "witte rijst" }],
      path: "reconcile",
    });
    first.applyReviewAction({
      itemId: "persist-item",
      action: "defer",
      actorId: "admin-persist",
      note: "defer to next batch",
    });

    const second = new MatchingReviewService({
      policy: {
        highConfidenceMin: 0.95,
        autoAcceptMin: 0.8,
        candidateMax: 10,
      },
      stateStore,
    });

    assert.equal(second.listQueueItems().length, 1);
    assert.equal(second.listQueueItems()[0]?.status, "deferred");
    assert.equal(second.listOverrides().length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
