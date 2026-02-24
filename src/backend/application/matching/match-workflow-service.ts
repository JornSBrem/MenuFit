import type { RuntimeConfigStore } from "../../../shared/config/index.ts";
import { completeWithLlmFallback } from "../../integrations/llm/provider-adapter.ts";
import type { LlmCompletionReason, LlmProvider } from "../../integrations/llm/types.ts";
import { MatchingReviewService } from "./review-service.ts";
import type {
  MatchAuditEvent,
  MatchEvaluationInput,
  MatchEvaluationResult,
  MatchOverrideRecord,
  MatchReviewQueueItem,
  ReviewActionInput,
  ReviewActionResult,
} from "./types";

const DEFAULT_FINISH_PASS_SYSTEM_PROMPT =
  "You are a deterministic grocery matcher. Return compact JSON only with candidateId and note.";

interface FinishPassSuggestion {
  candidateId?: string;
  note?: string;
}

export interface MatchFinishPassInput {
  enabled?: boolean;
  autoApply?: boolean;
  actorId?: string;
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface MatchWorkflowEvaluateInput extends MatchEvaluationInput {
  finishPass?: MatchFinishPassInput;
}

export interface MatchFinishPassResult {
  attempted: boolean;
  usedFallback?: boolean;
  reason?: LlmCompletionReason;
  provider?: LlmProvider;
  suggestedCandidateId?: string;
  note?: string;
  appliedReviewAction?: ReviewActionResult;
  skippedReason?: "disabled" | "high_confidence";
}

export interface MatchWorkflowEvaluateResult {
  evaluation: MatchEvaluationResult;
  finishPass: MatchFinishPassResult;
}

export interface MatchWorkflowServiceOptions {
  configStore: RuntimeConfigStore;
  reviewService?: MatchingReviewService;
  fetchImpl?: typeof fetch;
}

const extractJsonCandidate = (text: string): string | null => {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1];
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return null;
};

const parseFinishPassSuggestion = (text: string): FinishPassSuggestion => {
  const jsonCandidate = extractJsonCandidate(text) ?? text;

  try {
    const parsed = JSON.parse(jsonCandidate) as Record<string, unknown>;
    const rawCandidateId = parsed.candidateId;
    const rawNote = parsed.note;
    return {
      candidateId: typeof rawCandidateId === "string" && rawCandidateId.trim() ? rawCandidateId.trim() : undefined,
      note: typeof rawNote === "string" && rawNote.trim() ? rawNote.trim() : undefined,
    };
  } catch {
    return {};
  }
};

const buildFinishPassPrompt = (
  input: MatchEvaluationInput,
  evaluation: MatchEvaluationResult,
): string => {
  const lines = evaluation.rankedCandidates.map((row) => {
    const score = row.breakdown.finalScore.toFixed(4);
    return `- candidateId=${row.candidate.candidateId}; label=${row.candidate.label}; score=${score}`;
  });

  return [
    "Select best candidate for query. Return JSON only.",
    `itemId: ${input.itemId}`,
    `sourceRef: ${input.sourceRef}`,
    `query: ${input.query}`,
    "candidates:",
    ...lines,
    "json schema:",
    '{"candidateId":"<id-or-null>","note":"<short reason>"}',
  ].join("\n");
};

export class MatchWorkflowService {
  private readonly configStore: RuntimeConfigStore;

  private readonly reviewService: MatchingReviewService;

  private readonly fetchImpl: typeof fetch;

  constructor(options: MatchWorkflowServiceOptions) {
    this.configStore = options.configStore;
    this.reviewService = options.reviewService ?? new MatchingReviewService();
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async evaluate(input: MatchWorkflowEvaluateInput): Promise<MatchWorkflowEvaluateResult> {
    const evaluation = this.reviewService.evaluate(input);

    if (!input.finishPass?.enabled) {
      return {
        evaluation,
        finishPass: {
          attempted: false,
          skippedReason: "disabled",
        },
      };
    }

    if (!evaluation.queuedForReview) {
      return {
        evaluation,
        finishPass: {
          attempted: false,
          skippedReason: "high_confidence",
        },
      };
    }

    const completion = await completeWithLlmFallback(
      this.configStore,
      {
        userPrompt: buildFinishPassPrompt(input, evaluation),
        systemPrompt: input.finishPass.systemPrompt ?? DEFAULT_FINISH_PASS_SYSTEM_PROMPT,
        fallbackOutput: '{"candidateId":null,"note":"fallback"}',
        temperature: input.finishPass.temperature,
        maxOutputTokens: input.finishPass.maxOutputTokens,
      },
      this.fetchImpl,
    );

    const parsed = parseFinishPassSuggestion(completion.text);
    const validCandidateIds = new Set(evaluation.rankedCandidates.map((row) => row.candidate.candidateId));
    const suggestedCandidateId =
      parsed.candidateId && validCandidateIds.has(parsed.candidateId) ? parsed.candidateId : undefined;

    let appliedReviewAction: ReviewActionResult | undefined;
    if (suggestedCandidateId && input.finishPass.autoApply) {
      appliedReviewAction = this.reviewService.applyReviewAction({
        itemId: input.itemId,
        action: "map",
        actorId: input.finishPass.actorId?.trim() || "llm-finish-pass",
        candidateId: suggestedCandidateId,
        note: parsed.note ?? "Finish-pass automatic mapping.",
      });
    }

    return {
      evaluation,
      finishPass: {
        attempted: true,
        usedFallback: completion.usedFallback,
        reason: completion.reason,
        provider: completion.provider,
        suggestedCandidateId,
        note: parsed.note,
        appliedReviewAction,
      },
    };
  }

  applyReviewAction(input: ReviewActionInput): ReviewActionResult {
    return this.reviewService.applyReviewAction(input);
  }

  listQueueItems(): MatchReviewQueueItem[] {
    return this.reviewService.listQueueItems();
  }

  listAuditTrail(): MatchAuditEvent[] {
    return this.reviewService.listAuditTrail();
  }

  listOverrides(): MatchOverrideRecord[] {
    return this.reviewService.listOverrides();
  }
}
