import type {
  SharedMatchCandidate,
  SharedMatchConfidence,
  SharedMatchPolicy,
  SharedMatchPath,
  SharedRankedCandidate,
} from "../../domain/matching";

export type ReviewAction = "map" | "skip" | "defer";
export type ReviewQueueStatus = "pending" | "mapped" | "skipped" | "deferred";
export type MatchAuditEventType = "decision" | "review_action";

export interface MatchEvaluationInput {
  itemId: string;
  sourceRef: string;
  query: string;
  candidates: SharedMatchCandidate[];
  path?: SharedMatchPath;
}

export interface MatchEvaluationResult {
  itemId: string;
  sourceRef: string;
  decision: SharedMatchConfidence;
  policy: SharedMatchPolicy;
  rankedCandidates: SharedRankedCandidate[];
  topCandidateId?: string;
  queuedForReview: boolean;
}

export interface MatchReviewQueueItem {
  itemId: string;
  sourceRef: string;
  query: string;
  status: ReviewQueueStatus;
  decision: SharedMatchConfidence;
  suggestedCandidateId?: string;
  selectedCandidateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchAuditEvent {
  eventId: string;
  eventType: MatchAuditEventType;
  itemId: string;
  sourceRef: string;
  decision?: SharedMatchConfidence;
  action?: ReviewAction;
  candidateId?: string;
  createdAt: string;
  actorId?: string;
  note?: string;
}

export interface MatchOverrideRecord {
  overrideId: string;
  itemId: string;
  sourceRef: string;
  action: ReviewAction;
  candidateId?: string;
  createdAt: string;
  actorId: string;
  note?: string;
}

export interface ReviewActionInput {
  itemId: string;
  action: ReviewAction;
  actorId: string;
  candidateId?: string;
  note?: string;
}

export interface ReviewActionResult {
  queueItem: MatchReviewQueueItem;
  auditEvent: MatchAuditEvent;
  override: MatchOverrideRecord;
}
