import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultRuntimeConfig } from "../../../../shared/config/index.ts";
import { MatchWorkflowService } from "../../../application/matching/match-workflow-service.ts";
import { MatchingReviewService } from "../../../application/matching/review-service.ts";
import { createMatchRouteHandlers } from "./match-routes.ts";

const createService = () => {
  const reviewService = new MatchingReviewService({
    policy: {
      highConfidenceMin: 0.95,
      autoAcceptMin: 0.8,
      candidateMax: 10,
    },
    now: () => "2026-02-25T02:00:00.000Z",
  });

  return new MatchWorkflowService({
    reviewService,
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
            output_text: '{"candidateId":"cand-2","note":"finish pass recommendation"}',
          };
        },
      }) as Response) as typeof fetch,
  });
};

test("match evaluate route validates body", async () => {
  const routes = createMatchRouteHandlers(createService());

  const response = await routes.evaluate({
    itemId: "",
    sourceRef: "week:9:item:1",
    query: "volkoren pasta",
    candidates: [{ candidateId: "cand-1", label: "volkoren pasta" }],
  });

  assert.equal(response.ok, false);
  assert.equal(response.error?.code, "INVALID_BODY");
});

test("match routes provide evaluate + queue + review action flow", async () => {
  const routes = createMatchRouteHandlers(createService());

  const evaluate = await routes.evaluate({
    itemId: "item-1",
    sourceRef: "week:9:item:1",
    query: "volkoren pasta",
    path: "picnic",
    candidates: [
      { candidateId: "cand-1", label: "witte rijst" },
      { candidateId: "cand-2", label: "volkoren spaghetti", pathBonus: 0.05 },
    ],
    finishPass: {
      enabled: true,
      autoApply: false,
    },
  });
  assert.equal(evaluate.ok, true);
  assert.equal(evaluate.data?.evaluation.queuedForReview, true);
  assert.equal(evaluate.data?.finishPass.attempted, true);
  assert.equal(evaluate.data?.finishPass.suggestedCandidateId, "cand-2");

  const queue = routes.queue();
  assert.equal(queue.ok, true);
  assert.equal(queue.data?.length, 1);
  assert.equal(queue.data?.[0]?.status, "pending");

  const review = routes.reviewAction({
    itemId: "item-1",
    action: "map",
    actorId: "admin-1",
    candidateId: "cand-2",
  });
  assert.equal(review.ok, true);
  assert.equal(review.data?.queueItem.status, "mapped");

  const overrides = routes.overrides();
  assert.equal(overrides.ok, true);
  assert.equal(overrides.data?.length, 1);
});
