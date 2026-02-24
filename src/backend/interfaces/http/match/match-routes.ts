import type {
  MatchAuditEvent,
  MatchOverrideRecord,
  MatchReviewQueueItem,
  MatchWorkflowEvaluateInput,
  MatchWorkflowEvaluateResult,
  MatchWorkflowService,
  ReviewActionInput,
  ReviewActionResult,
} from "../../../application/matching";
import type { SharedMatchPath } from "../../../domain/matching/index.ts";

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    hint?: string;
  };
}

export interface MatchEvaluateBody {
  itemId: string;
  sourceRef: string;
  query: string;
  path?: SharedMatchPath;
  candidates: Array<{
    candidateId: string;
    label: string;
    canonicalLabel?: string;
    pathBonus?: number;
  }>;
  finishPass?: {
    enabled?: boolean;
    autoApply?: boolean;
    actorId?: string;
    systemPrompt?: string;
    temperature?: number;
    maxOutputTokens?: number;
  };
}

export interface MatchReviewActionBody {
  itemId: string;
  action: "map" | "skip" | "defer";
  actorId: string;
  candidateId?: string;
  note?: string;
}

const invalidBody = (hint: string): ApiEnvelope<never> => ({
  ok: false,
  error: {
    code: "INVALID_BODY",
    message: "Request body is invalid.",
    hint,
  },
});

const serviceError = (code: string, message: string): ApiEnvelope<never> => ({
  ok: false,
  error: {
    code,
    message,
  },
});

const validateEvaluateBody = (body: MatchEvaluateBody): string | null => {
  if (!body.itemId?.trim()) {
    return "itemId is required";
  }
  if (!body.sourceRef?.trim()) {
    return "sourceRef is required";
  }
  if (!body.query?.trim()) {
    return "query is required";
  }
  if (body.path && !["reconcile", "picnic"].includes(body.path)) {
    return "path must be reconcile or picnic";
  }
  if (!Array.isArray(body.candidates) || body.candidates.length === 0) {
    return "candidates must contain at least one candidate";
  }
  if (body.candidates.some((candidate) => !candidate.candidateId?.trim() || !candidate.label?.trim())) {
    return "each candidate requires candidateId and label";
  }
  return null;
};

const validateReviewActionBody = (body: MatchReviewActionBody): string | null => {
  if (!body.itemId?.trim()) {
    return "itemId is required";
  }
  if (!["map", "skip", "defer"].includes(body.action)) {
    return "action must be map, skip, or defer";
  }
  if (!body.actorId?.trim()) {
    return "actorId is required";
  }
  if (body.action === "map" && !body.candidateId?.trim()) {
    return "candidateId is required for map action";
  }
  return null;
};

const mapEvaluateBody = (body: MatchEvaluateBody): MatchWorkflowEvaluateInput => ({
  itemId: body.itemId,
  sourceRef: body.sourceRef,
  query: body.query,
  candidates: body.candidates,
  path: body.path,
  finishPass: body.finishPass,
});

const mapReviewActionBody = (body: MatchReviewActionBody): ReviewActionInput => ({
  itemId: body.itemId,
  action: body.action,
  actorId: body.actorId,
  candidateId: body.candidateId,
  note: body.note,
});

export const handleMatchEvaluate = async (
  service: MatchWorkflowService,
  body: MatchEvaluateBody,
): Promise<ApiEnvelope<MatchWorkflowEvaluateResult>> => {
  const validationError = validateEvaluateBody(body);
  if (validationError) {
    return invalidBody(validationError);
  }

  try {
    const result = await service.evaluate(mapEvaluateBody(body));
    return { ok: true, data: result };
  } catch (error) {
    return serviceError("MATCH_EVALUATE_ERROR", error instanceof Error ? error.message : "Unknown evaluate failure.");
  }
};

export const handleMatchQueue = (service: MatchWorkflowService): ApiEnvelope<MatchReviewQueueItem[]> => ({
  ok: true,
  data: service.listQueueItems(),
});

export const handleMatchAuditTrail = (service: MatchWorkflowService): ApiEnvelope<MatchAuditEvent[]> => ({
  ok: true,
  data: service.listAuditTrail(),
});

export const handleMatchOverrides = (service: MatchWorkflowService): ApiEnvelope<MatchOverrideRecord[]> => ({
  ok: true,
  data: service.listOverrides(),
});

export const handleMatchReviewAction = (
  service: MatchWorkflowService,
  body: MatchReviewActionBody,
): ApiEnvelope<ReviewActionResult> => {
  const validationError = validateReviewActionBody(body);
  if (validationError) {
    return invalidBody(validationError);
  }

  try {
    const result = service.applyReviewAction(mapReviewActionBody(body));
    return { ok: true, data: result };
  } catch (error) {
    return serviceError("MATCH_REVIEW_ERROR", error instanceof Error ? error.message : "Unknown review-action failure.");
  }
};

export interface MatchRouteHandlers {
  evaluate: (body: MatchEvaluateBody) => Promise<ApiEnvelope<MatchWorkflowEvaluateResult>>;
  queue: () => ApiEnvelope<MatchReviewQueueItem[]>;
  auditTrail: () => ApiEnvelope<MatchAuditEvent[]>;
  overrides: () => ApiEnvelope<MatchOverrideRecord[]>;
  reviewAction: (body: MatchReviewActionBody) => ApiEnvelope<ReviewActionResult>;
}

export const createMatchRouteHandlers = (service: MatchWorkflowService): MatchRouteHandlers => ({
  evaluate: (body) => handleMatchEvaluate(service, body),
  queue: () => handleMatchQueue(service),
  auditTrail: () => handleMatchAuditTrail(service),
  overrides: () => handleMatchOverrides(service),
  reviewAction: (body) => handleMatchReviewAction(service, body),
});
