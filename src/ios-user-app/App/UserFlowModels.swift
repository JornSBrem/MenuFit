import Foundation

struct ApiEnvelope<T: Decodable>: Decodable {
  let ok: Bool
  let data: T?
  let error: ApiErrorPayload?
}

struct UserAuthSession: Codable {
  let accessToken: String
  let subjectId: String
  let picnicAccountId: String
  let householdId: String
  let expiresAtEpochSeconds: Int?
}

struct ApiErrorPayload: Decodable {
  let code: String
  let message: String
  let hint: String?
}

struct WeekSelection: Codable, Hashable {
  var year: Int
  var week: Int
  var kcal: Int
  var basePersons: Int
}

struct WeekSummaryResponse: Codable {
  let weekPlan: GoldWeekPlanView
  let matchStatus: GoldMatchStatusView
  let cartPlan: GoldCartPlanView
}

struct WeekGroceriesResponse: Codable {
  let weekPlanId: String
  let groceries: [GoldGroceryTotalView]
  let reconcile: [GoldGroceryReconcileView]
}

struct GoldWeekPlanView: Codable {
  let weekPlanId: String
  let year: Int
  let week: Int
  let kcal: Int
  let basePersons: Int
  let mealCount: Int
  let sourceObjectId: String
  let transformVersion: String
  let generatedAt: String
}

struct GoldMatchStatusView: Codable {
  let totalItems: Int
  let resolvedItems: Int
  let unresolvedItems: Int
  let coverageScore: Double
}

struct GoldCartPlanView: Codable {
  let cartPlanId: String
  let weekPlanId: String
  let itemCount: Int
  let unresolvedCount: Int
  let generatedAt: String
}

struct GoldGroceryTotalView: Codable, Identifiable {
  let canonicalName: String
  let totalAmount: Double?
  let unit: String?
  let requiresReview: Bool

  var id: String { canonicalName }
}

struct GoldGroceryReconcileView: Codable, Identifiable {
  let canonicalName: String
  let reconcileStatus: String
  let note: String?

  var id: String { canonicalName }
}

struct CartSyncItem: Codable {
  let itemId: String
  let quantity: Double
  let unit: String?
}

struct CartSyncRequestBody: Codable {
  let idempotencyKey: String
  let weekPlanId: String
  let householdId: String
  let source: String
  let mode: String
  let items: [CartSyncItem]
}

struct CartSyncReport: Codable {
  let reportId: String
  let idempotencyKey: String
  let weekPlanId: String
  let householdId: String
  let source: String
  let mode: String
  let status: String
  let itemCount: Int
  let syncedCount: Int
  let failedCount: Int
  let idempotentReplay: Bool
  let message: String
  let externalCartId: String?
  let errors: [String]?
  let createdAt: String
}

struct MatchCandidateInput: Codable {
  let candidateId: String
  let label: String
  let canonicalLabel: String?
  let pathBonus: Double?
}

struct MatchFinishPassInput: Codable {
  let enabled: Bool
  let autoApply: Bool
  let actorId: String
}

struct MatchEvaluateRequestBody: Codable {
  let itemId: String
  let sourceRef: String
  let query: String
  let path: String
  let candidates: [MatchCandidateInput]
  let finishPass: MatchFinishPassInput
}

struct MatchRankedCandidate: Codable, Identifiable {
  struct Candidate: Codable {
    let candidateId: String
    let label: String
    let canonicalLabel: String?
  }

  struct Breakdown: Codable {
    let finalScore: Double
  }

  let candidate: Candidate
  let breakdown: Breakdown

  var id: String { candidate.candidateId }
}

struct MatchEvaluationResult: Codable {
  let itemId: String
  let sourceRef: String
  let decision: String
  let policy: String
  let rankedCandidates: [MatchRankedCandidate]
  let topCandidateId: String?
  let queuedForReview: Bool
}

struct MatchFinishPassResult: Codable {
  let attempted: Bool
  let usedFallback: Bool?
  let reason: String?
  let provider: String?
  let suggestedCandidateId: String?
  let note: String?
}

struct MatchWorkflowEvaluateResponse: Codable {
  let evaluation: MatchEvaluationResult
  let finishPass: MatchFinishPassResult
}

struct MatchReviewQueueItem: Codable, Identifiable {
  let itemId: String
  let sourceRef: String
  let query: String
  let status: String
  let decision: String
  let suggestedCandidateId: String?
  let selectedCandidateId: String?
  let createdAt: String
  let updatedAt: String

  var id: String { itemId }
}

struct MatchReviewActionRequestBody: Codable {
  let itemId: String
  let action: String
  let actorId: String
  let candidateId: String?
  let note: String?
}

struct MatchReviewActionResponse: Codable {
  struct QueueItem: Codable {
    let itemId: String
    let status: String
    let selectedCandidateId: String?
  }

  let queueItem: QueueItem
}

struct CachedWeekBundle: Codable {
  let selection: WeekSelection
  let summary: WeekSummaryResponse
  let groceries: WeekGroceriesResponse
  let cachedAt: String
}
