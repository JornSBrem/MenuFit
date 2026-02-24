import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeConfigStore } from "../../../shared/config/index.ts";
import { MatchingReviewService } from "./review-service.ts";
import { MatchWorkflowService } from "./match-workflow-service.ts";

const createConfigStub = (overrides: Record<string, unknown> = {}): RuntimeConfigStore => {
  const values: Record<string, unknown> = {
    LLM_PROVIDER: "openai",
    LLM_BASE_URL: "https://api.openai.com/v1",
    LLM_API_KEY: "test-key",
    LLM_API_VERSION: "2024-10-21",
    LLM_MODEL: "gpt-4o-mini",
    LLM_AZURE_DEPLOYMENT: "",
    ...overrides,
  };

  return {
    get(key: string) {
      return values[key];
    },
  } as RuntimeConfigStore;
};

test("workflow evaluate performs finish-pass and can auto-apply review mapping", async () => {
  const reviewService = new MatchingReviewService({
    policy: {
      highConfidenceMin: 0.95,
      autoAcceptMin: 0.8,
      candidateMax: 10,
    },
    now: () => "2026-02-24T23:30:00.000Z",
  });

  const service = new MatchWorkflowService({
    configStore: createConfigStub(),
    reviewService,
    fetchImpl: (async () =>
      ({
        ok: true,
        status: 200,
        async json() {
          return {
            output_text: '{"candidateId":"cand-2","note":"closest lexical fit"}',
          };
        },
      }) as Response) as typeof fetch,
  });

  const result = await service.evaluate({
    itemId: "item-1",
    sourceRef: "week:9:item:1",
    query: "volkoren pasta",
    candidates: [
      { candidateId: "cand-1", label: "witte rijst" },
      { candidateId: "cand-2", label: "volkoren spaghetti" },
    ],
    path: "picnic",
    finishPass: {
      enabled: true,
      autoApply: true,
      actorId: "llm-bot",
    },
  });

  assert.equal(result.evaluation.queuedForReview, true);
  assert.equal(result.finishPass.attempted, true);
  assert.equal(result.finishPass.usedFallback, false);
  assert.equal(result.finishPass.suggestedCandidateId, "cand-2");
  assert.equal(result.finishPass.appliedReviewAction?.queueItem.status, "mapped");
  assert.equal(service.listQueueItems()[0]?.status, "mapped");
});

test("workflow evaluate remains non-blocking when finish-pass falls back", async () => {
  const reviewService = new MatchingReviewService({
    policy: {
      highConfidenceMin: 0.95,
      autoAcceptMin: 0.8,
      candidateMax: 10,
    },
  });

  const service = new MatchWorkflowService({
    configStore: createConfigStub({
      LLM_API_KEY: "",
    }),
    reviewService,
    fetchImpl: (async () => {
      throw new Error("should not be called");
    }) as typeof fetch,
  });

  const result = await service.evaluate({
    itemId: "item-2",
    sourceRef: "week:9:item:2",
    query: "volkoren pasta",
    candidates: [
      { candidateId: "cand-1", label: "witte rijst" },
      { candidateId: "cand-2", label: "volkoren spaghetti" },
    ],
    path: "reconcile",
    finishPass: {
      enabled: true,
      autoApply: true,
    },
  });

  assert.equal(result.evaluation.queuedForReview, true);
  assert.equal(result.finishPass.attempted, true);
  assert.equal(result.finishPass.usedFallback, true);
  assert.equal(result.finishPass.appliedReviewAction, undefined);
  assert.equal(service.listQueueItems()[0]?.status, "pending");
});
