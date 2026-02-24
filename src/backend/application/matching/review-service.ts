import {
  classifyMatchConfidence,
  rankCandidatesShared,
  resolveSharedMatchPolicy,
  type SharedMatchPolicy,
} from "../../domain/matching/shared-core.ts";
import type { AuditTrailService } from "../audit/audit-trail-service.ts";
import type {
  MatchAuditEvent,
  MatchEvaluationInput,
  MatchEvaluationResult,
  MatchOverrideRecord,
  MatchReviewQueueItem,
  ReviewActionInput,
  ReviewActionResult,
  ReviewQueueStatus,
} from "./types";

export interface MatchingReviewServiceOptions {
  policy?: Partial<SharedMatchPolicy>;
  now?: () => string;
  auditTrail?: AuditTrailService;
}

export class MatchingReviewService {
  private readonly queue = new Map<string, MatchReviewQueueItem>();

  private readonly matchAuditTrail: MatchAuditEvent[] = [];

  private readonly overrides: MatchOverrideRecord[] = [];

  private sequence = 0;

  private readonly policy: SharedMatchPolicy;

  private readonly now: () => string;

  private readonly centralAuditTrail?: AuditTrailService;

  constructor(options?: MatchingReviewServiceOptions) {
    this.policy = resolveSharedMatchPolicy(options?.policy);
    this.now = options?.now ?? (() => new Date().toISOString());
    this.centralAuditTrail = options?.auditTrail;
  }

  evaluate(input: MatchEvaluationInput): MatchEvaluationResult {
    const rankedCandidates = rankCandidatesShared(input.query, input.candidates, {
      path: input.path ?? "reconcile",
      policy: { candidateMax: this.policy.candidateMax },
    });

    const topCandidate = rankedCandidates[0];
    const decision = classifyMatchConfidence(topCandidate?.breakdown.finalScore ?? 0, this.policy);
    const topCandidateId = topCandidate?.candidate.candidateId;
    const queuedForReview = decision.confidence !== "high";
    const now = this.now();

    if (queuedForReview) {
      this.upsertQueueItem({
        itemId: input.itemId,
        sourceRef: input.sourceRef,
        query: input.query,
        decision: decision.confidence,
        suggestedCandidateId: topCandidateId,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    }

    this.matchAuditTrail.push({
      eventId: this.nextId("audit"),
      eventType: "decision",
      itemId: input.itemId,
      sourceRef: input.sourceRef,
      decision: decision.confidence,
      candidateId: topCandidateId,
      createdAt: now,
      note: `topScore=${decision.topScore.toFixed(4)}`,
    });
    this.centralAuditTrail?.record({
      category: "matching",
      action: "decision",
      resourceId: input.itemId,
      outcome: "success",
      details: {
        sourceRef: input.sourceRef,
        path: input.path ?? "reconcile",
        decision: decision.confidence,
        topCandidateId,
        topScore: Number(decision.topScore.toFixed(4)),
        queuedForReview,
      },
    });

    return {
      itemId: input.itemId,
      sourceRef: input.sourceRef,
      decision: decision.confidence,
      policy: this.policy,
      rankedCandidates,
      topCandidateId,
      queuedForReview,
    };
  }

  applyReviewAction(input: ReviewActionInput): ReviewActionResult {
    const queueItem = this.queue.get(input.itemId);
    if (!queueItem) {
      this.centralAuditTrail?.record({
        category: "matching",
        action: "review_action_rejected",
        resourceId: input.itemId,
        actorId: input.actorId,
        outcome: "failure",
        details: {
          reason: "review_item_not_found",
        },
      });
      throw new Error(`Review item not found: ${input.itemId}`);
    }

    if (input.action === "map" && !input.candidateId) {
      this.centralAuditTrail?.record({
        category: "matching",
        action: "review_action_rejected",
        resourceId: input.itemId,
        actorId: input.actorId,
        outcome: "failure",
        details: {
          reason: "candidate_required_for_map",
        },
      });
      throw new Error('Review action "map" requires candidateId');
    }

    const now = this.now();
    const statusByAction: Record<ReviewActionInput["action"], ReviewQueueStatus> = {
      map: "mapped",
      skip: "skipped",
      defer: "deferred",
    };
    const updatedItem: MatchReviewQueueItem = {
      ...queueItem,
      status: statusByAction[input.action],
      selectedCandidateId: input.action === "map" ? input.candidateId : undefined,
      updatedAt: now,
    };
    this.queue.set(updatedItem.itemId, updatedItem);

    const override: MatchOverrideRecord = {
      overrideId: this.nextId("override"),
      itemId: updatedItem.itemId,
      sourceRef: updatedItem.sourceRef,
      action: input.action,
      candidateId: input.candidateId,
      createdAt: now,
      actorId: input.actorId,
      note: input.note,
    };
    this.overrides.push(override);

    const auditEvent: MatchAuditEvent = {
      eventId: this.nextId("audit"),
      eventType: "review_action",
      itemId: updatedItem.itemId,
      sourceRef: updatedItem.sourceRef,
      decision: updatedItem.decision,
      action: input.action,
      candidateId: input.candidateId,
      createdAt: now,
      actorId: input.actorId,
      note: input.note,
    };
    this.matchAuditTrail.push(auditEvent);
    this.centralAuditTrail?.record({
      category: "matching",
      action: "review_action",
      resourceId: updatedItem.itemId,
      actorId: input.actorId,
      outcome: "success",
      details: {
        sourceRef: updatedItem.sourceRef,
        action: input.action,
        decision: updatedItem.decision,
        candidateId: input.candidateId,
      },
    });

    return {
      queueItem: updatedItem,
      auditEvent,
      override,
    };
  }

  listQueueItems(): MatchReviewQueueItem[] {
    return Array.from(this.queue.values()).sort((a, b) => a.itemId.localeCompare(b.itemId));
  }

  listAuditTrail(): MatchAuditEvent[] {
    return [...this.matchAuditTrail];
  }

  listOverrides(): MatchOverrideRecord[] {
    return [...this.overrides];
  }

  getPolicy(): SharedMatchPolicy {
    return this.policy;
  }

  private upsertQueueItem(item: MatchReviewQueueItem): void {
    const existing = this.queue.get(item.itemId);
    if (!existing) {
      this.queue.set(item.itemId, item);
      return;
    }
    this.queue.set(item.itemId, {
      ...existing,
      sourceRef: item.sourceRef,
      query: item.query,
      decision: item.decision,
      suggestedCandidateId: item.suggestedCandidateId,
      updatedAt: item.updatedAt,
    });
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }
}
