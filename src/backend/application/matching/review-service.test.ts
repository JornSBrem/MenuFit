import assert from "node:assert/strict";
import test from "node:test";

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
