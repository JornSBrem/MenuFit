import Foundation

@MainActor
final class UserFlowViewModel: ObservableObject {
  @Published var selection = WeekSelection(year: 2026, week: 9, kcal: 1800, basePersons: 2)
  @Published var summary: WeekSummaryResponse?
  @Published var groceries: WeekGroceriesResponse?
  @Published var isUsingOfflineCache = false
  @Published var isLoading = false
  @Published var isMatchLoading = false
  @Published var lastError: String?
  @Published var lastSyncReport: CartSyncReport?
  @Published var authSession: UserAuthSession?
  @Published var matchQueue: [MatchReviewQueueItem] = []
  @Published var lastMatchEvaluation: MatchWorkflowEvaluateResponse?
  @Published var lastMatchReview: MatchReviewActionResponse?

  private let api: BackendAPI
  private let cache: OfflineCacheStore
  private let authStore: AuthSessionStore
  private let fallbackHouseholdId: String

  init(
    api: BackendAPI,
    cache: OfflineCacheStore,
    authStore: AuthSessionStore,
    fallbackHouseholdId: String = "default-household"
  ) {
    self.api = api
    self.cache = cache
    self.authStore = authStore
    self.authSession = authStore.session
    self.fallbackHouseholdId = fallbackHouseholdId
  }

  func loadWeekBundle() async {
    isLoading = true
    defer { isLoading = false }
    lastError = nil
    authSession = authStore.session

    do {
      async let summaryResponse = api.fetchWeekSummary(selection: selection)
      async let groceriesResponse = api.fetchWeekGroceries(selection: selection)
      let summaryPayload = try await summaryResponse
      let groceriesPayload = try await groceriesResponse

      summary = summaryPayload
      groceries = groceriesPayload
      isUsingOfflineCache = false

      let bundle = CachedWeekBundle(
        selection: selection,
        summary: summaryPayload,
        groceries: groceriesPayload,
        cachedAt: ISO8601DateFormatter().string(from: Date())
      )
      try? cache.save(bundle: bundle)
    } catch {
      do {
        let cached = try cache.load(selection: selection)
        summary = cached.summary
        groceries = cached.groceries
        isUsingOfflineCache = true
        lastError = AppStrings.text(.offlineDataLoaded, error.localizedDescription)
      } catch {
        lastError = AppStrings.text(.loadWeekOnlineOrOfflineFailed)
      }
    }
  }

  func syncCartOnlineOnly() async {
    lastError = nil
    guard let summary, let groceries else {
      lastError = AppStrings.text(.loadWeekFirst)
      return
    }

    let items = groceries.groceries.map {
      CartSyncItem(
        itemId: $0.canonicalName.replacingOccurrences(of: " ", with: "-").lowercased(),
        quantity: $0.totalAmount ?? 1,
        unit: $0.unit
      )
    }

    let householdId = authSession?.householdId ?? fallbackHouseholdId
    let request = CartSyncRequestBody(
      idempotencyKey: "\(summary.weekPlan.weekPlanId)-\(householdId)",
      weekPlanId: summary.weekPlan.weekPlanId,
      householdId: householdId,
      source: "user",
      mode: "execute",
      items: items
    )

    do {
      lastSyncReport = try await api.syncCart(body: request)
    } catch {
      lastError = AppStrings.text(.cartSyncFailedOnlineOnly, error.localizedDescription)
    }
  }

  func loadMatchQueue() async {
    isMatchLoading = true
    defer { isMatchLoading = false }
    lastError = nil

    do {
      matchQueue = try await api.fetchMatchQueue()
    } catch {
      lastError = AppStrings.text(.matchQueueLoadFailed, error.localizedDescription)
    }
  }

  func evaluateFirstUnresolvedMatch() async {
    isMatchLoading = true
    defer { isMatchLoading = false }
    lastError = nil

    guard let groceries else {
      lastError = AppStrings.text(.loadWeekBeforeMatchFlow)
      return
    }

    guard let unresolved = groceries.reconcile.first(where: { $0.reconcileStatus != "matched" }) else {
      lastError = AppStrings.text(.noUnresolvedMatchItems)
      return
    }

    let candidates = buildCandidates(for: unresolved.canonicalName, groceries: groceries.groceries)
    let actorId = authSession?.subjectId ?? "ios-user"
    let body = MatchEvaluateRequestBody(
      itemId: unresolved.canonicalName,
      sourceRef: groceries.weekPlanId,
      query: unresolved.canonicalName,
      path: "reconcile",
      candidates: candidates,
      finishPass: MatchFinishPassInput(enabled: true, autoApply: true, actorId: actorId)
    )

    do {
      lastMatchEvaluation = try await api.evaluateMatch(body: body)
      await loadMatchQueue()
    } catch {
      lastError = AppStrings.text(.matchEvaluateFailed, error.localizedDescription)
    }
  }

  func applyMatchAction(item: MatchReviewQueueItem, action: String) async {
    isMatchLoading = true
    defer { isMatchLoading = false }
    lastError = nil

    let actorId = authSession?.subjectId ?? "ios-user"
    var candidateId: String?
    if action == "map" {
      candidateId = item.suggestedCandidateId ?? item.selectedCandidateId
      if candidateId == nil {
        lastError = AppStrings.text(.matchMapNeedsCandidate)
        return
      }
    }

    do {
      lastMatchReview = try await api.applyMatchReviewAction(
        body: MatchReviewActionRequestBody(
          itemId: item.itemId,
          action: action,
          actorId: actorId,
          candidateId: candidateId,
          note: nil
        )
      )
      await loadMatchQueue()
    } catch {
      lastError = AppStrings.text(.matchReviewFailed, error.localizedDescription)
    }
  }

  private func buildCandidates(
    for unresolvedName: String,
    groceries: [GoldGroceryTotalView]
  ) -> [MatchCandidateInput] {
    var seen = Set<String>()
    var candidates: [MatchCandidateInput] = []

    for grocery in groceries.prefix(10) {
      let candidateId = slugify(grocery.canonicalName)
      if seen.contains(candidateId) {
        continue
      }
      seen.insert(candidateId)
      candidates.append(
        MatchCandidateInput(
          candidateId: candidateId,
          label: grocery.canonicalName,
          canonicalLabel: grocery.canonicalName,
          pathBonus: grocery.requiresReview ? 0.05 : 0.2
        )
      )
    }

    if candidates.isEmpty {
      let fallbackId = slugify(unresolvedName)
      candidates.append(
        MatchCandidateInput(
          candidateId: fallbackId.isEmpty ? "fallback-item" : fallbackId,
          label: unresolvedName,
          canonicalLabel: unresolvedName,
          pathBonus: 0.1
        )
      )
    }

    return candidates
  }

  private func slugify(_ value: String) -> String {
    value
      .lowercased()
      .replacingOccurrences(of: "[^a-z0-9]+", with: "-", options: .regularExpression)
      .trimmingCharacters(in: CharacterSet(charactersIn: "-"))
  }
}
