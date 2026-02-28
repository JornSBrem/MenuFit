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
  /// Ingesteld na login/register via username+password flow
  var username: String? = nil
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
  let meals: [GoldWeekMealView]?
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

struct GoldMealIngredient: Codable {
  let text: String
}

struct GoldRecipeStep: Codable {
  let step: Int
  let text: String
}

struct GoldWeekMealView: Codable, Identifiable {
  let mealId: String
  let dayLabel: String
  let mealLabel: String
  let recipeId: String?
  let recipeName: String?
  let imageUrl: String?
  let kcal: Int?
  let ingredients: [GoldMealIngredient]?
  let steps: [GoldRecipeStep]?

  var id: String { mealId }
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

struct HouseholdStatusResponse: Codable {
  let household: HouseholdRecord?
  let pendingInvitations: [HouseholdInvitation]
}

struct HouseholdRecord: Codable {
  let householdId: String
  let name: String?
  let createdAt: String
  let updatedAt: String
  let members: [HouseholdMember]
  let inviteCode: String?
}

struct HouseholdMember: Codable, Identifiable {
  let userId: String
  let role: String
  let joinedAt: String
  let displayName: String?
  let kcalPreference: Int?

  var id: String { userId }
}

struct HouseholdInvitation: Codable, Identifiable {
  let invitationId: String
  let householdId: String
  let invitedUserId: String
  let invitedByUserId: String
  let status: String
  let createdAt: String
  let respondedAt: String?

  var id: String { invitationId }
}

struct CachedWeekBundle: Codable {
  let selection: WeekSelection
  let summary: WeekSummaryResponse
  let groceries: WeekGroceriesResponse
  let cachedAt: String
}

struct DayCard: Identifiable {
  var id: String { dayLabel }
  let dayLabel: String
  let meals: [GoldWeekMealView]
  var firstMeal: GoldWeekMealView? { meals.first }
  var mealCount: Int { meals.count }
}

struct UserRecipeRecord: Codable, Identifiable {
  let recipeId: String
  let name: String
  let imageUrl: String?
  let kcal: Int?
  let ingredients: [GoldMealIngredient]?
  let steps: [GoldRecipeStep]?
  var id: String { recipeId }

  /// Zet dit record om naar een GoldWeekMealView zodat RecipeDetailSheet gebruikt kan worden.
  func toMealView() -> GoldWeekMealView {
    GoldWeekMealView(
      mealId: recipeId,
      dayLabel: "",
      mealLabel: name,
      recipeId: recipeId,
      recipeName: name,
      imageUrl: imageUrl,
      kcal: kcal,
      ingredients: ingredients,
      steps: steps
    )
  }
}

struct EmptyBody: Codable {}

// MARK: - Auth request/response structs

struct AuthLoginRequest: Codable {
  let username: String
  let password: String
}

struct AuthRegisterRequest: Codable {
  let username: String
  let password: String
  let email: String?
  let profile: UserProfileData?
}

struct UserProfileData: Codable {
  var displayName: String?
  var birthYear: Int?
  var gender: String?
  var weightKg: Double?
  var heightCm: Double?
  var activityLevel: String?
  var kcalGoal: Int?
  var photoPath: String?
  var allergies: [String]?
  var dietaryPreferences: [String]?
}

struct ProfileUpdateRequest: Codable {
  var displayName: String?
  var birthYear: Int?
  var gender: String?
  var weightKg: Double?
  var heightCm: Double?
  var activityLevel: String?
  var kcalGoal: Int?
  var allergies: [String]?
  var dietaryPreferences: [String]?
}

struct ProfileUpdateResponse: Codable {
  let userId: String
  let username: String
  let email: String?
  let profile: UserProfileData?
}

struct KcalSuggestionRequest: Codable {
  let birthYear: Int?
  let gender: String?
  let weightKg: Double?
  let heightCm: Double?
  let activityLevel: String?
}

struct KcalSuggestionResponse: Codable {
  let suggestedKcal: Int?
}

struct OnboardingCompleteResponse: Codable {
  let completed: Bool
}

struct AuthTokenResponse: Codable {
  let token: String
  let userId: String
  let username: String
  let email: String?
  let profile: UserProfileData?
  let onboardingCompletedAt: String?
  let expiresAtEpochSeconds: Int
}

struct AuthMeResponse: Codable {
  let userId: String
  let username: String
  let email: String?
  let profile: UserProfileData?
  let onboardingCompletedAt: String?
}

// MARK: - Household request/response structs

struct HouseholdCreateResponse: Codable {
  let householdId: String
  let inviteCode: String?
}

struct HouseholdJoinRequest: Codable {
  let code: String
}

struct HouseholdJoinResponse: Codable {
  let householdId: String
  let memberCount: Int
}

struct HouseholdRenameRequest: Codable {
  let householdId: String
  let name: String
}

struct HouseholdRenameResponse: Codable {
  let householdId: String
  let name: String?
}

struct HouseholdSetKcalRequest: Codable {
  let kcal: Int
}

struct HouseholdSetKcalResponse: Codable {
  let householdId: String
}

struct HouseholdRemoveMemberRequest: Codable {
  let householdId: String
  let userId: String
}

struct HouseholdRemoveMemberResponse: Codable {
  let householdId: String
  let memberCount: Int
}

struct HouseholdLeaveResponse: Codable {
  let left: Bool
}

struct AccountDeleteResponse: Codable {
  let deleted: Bool
}

struct HouseholdGroceryMemberBreakdown: Codable, Identifiable {
  let userId: String
  let displayName: String
  let kcal: Int
  let itemCount: Int

  var id: String { userId }
}

struct HouseholdGroceriesResponse: Codable {
  let householdId: String
  let year: Int
  let week: Int
  let basePersons: Int
  let memberCount: Int
  let memberBreakdown: [HouseholdGroceryMemberBreakdown]
  let groceries: [GoldGroceryTotalView]
}

// MARK: - Picnic link structs

struct PicnicLinkRequest: Codable {
  let email: String
  let password: String
}
