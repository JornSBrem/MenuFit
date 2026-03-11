import Foundation

enum AuthGateState {
  case onboarding
  case expired
  case ready
}

enum OrderSyncOutcome {
  case success
  case partialFailure
  case failed
}

struct AuthSessionDraft {
  var accessToken: String
  var subjectId: String
  var picnicAccountId: String
  var householdId: String
  var expiresAtEpochText: String
}

@MainActor
final class UserFlowViewModel: ObservableObject {
  let fixedKcals: [Int] = [1250, 1500, 1800, 2100]

  @Published var selection = WeekSelection(year: 2026, week: 9, kcal: 1800, basePersons: 2)
  @Published var summary: WeekSummaryResponse?
  @Published var groceries: WeekGroceriesResponse?
  @Published var isUsingOfflineCache = false
  @Published var isLoading = false
  @Published var isMatchLoading = false
  @Published var lastError: String?
  @Published var recipes: [UserRecipeRecord] = []
  @Published var isRecipesLoading = false
  @Published var recipesSearchText = ""
  @Published var lastSyncReport: CartSyncReport?
  @Published var authSession: UserAuthSession?
  @Published var matchQueue: [MatchReviewQueueItem] = []
  @Published var lastMatchEvaluation: MatchWorkflowEvaluateResponse?
  @Published var lastMatchReview: MatchReviewActionResponse?
  @Published var authGateState: AuthGateState = .onboarding
  @Published var authDraft = AuthSessionDraft(
    accessToken: "",
    subjectId: "ios-user",
    picnicAccountId: "picnic-default",
    householdId: "default-household",
    expiresAtEpochText: ""
  )
  @Published var householdMembers: [HouseholdMember] = []
  @Published var selectedMemberId = ""
  @Published var selectedDayLabel = ""
  @Published var checkedGroceryItemIds = Set<String>()
  @Published var favoriteRecipeIds = Set<String>()
  @Published var picnicEnabled: Bool = false
  @Published var mealNotificationsEnabled: Bool = false

  // Config screen state
  @Published var configHousehold: HouseholdCreateResponse?
  @Published var configHouseholdRecord: HouseholdRecord?
  @Published var householdGroceries: HouseholdGroceriesResponse?
  @Published var isConfigLoading = false
  @Published var configMessage: String?

  // Eetmeter state
  @Published var eetmeterIsIngelogd: Bool = false
  @Published var eetmeterDag: EetmeterDagItem? = nil
  @Published var eetmeterDatum: String = ""
  @Published var isEetmeterLoading = false
  @Published var eetmeterError: String? = nil

  private let api: BackendAPI
  private let cache: OfflineCacheStore
  private let authStore: AuthSessionStore
  private let fallbackHouseholdId: String
  private let defaults: UserDefaults
  private var didBootstrap = false

  init(
    api: BackendAPI,
    cache: OfflineCacheStore,
    authStore: AuthSessionStore,
    defaults: UserDefaults = .standard,
    fallbackHouseholdId: String = "default-household"
  ) {
    self.api = api
    self.cache = cache
    self.authStore = authStore
    self.defaults = defaults
    self.authSession = authStore.session
    self.fallbackHouseholdId = fallbackHouseholdId
    // Laad opgeslagen kcal-voorkeur uit UserDefaults
    let savedKcal = defaults.integer(forKey: "menufit.preferred-kcal")
    if [1250, 1500, 1800, 2100].contains(savedKcal) {
      selection.kcal = savedKcal
    }
    let savedFavorites = defaults.stringArray(forKey: "menufit.favorite-recipes") ?? []
    favoriteRecipeIds = Set(savedFavorites)
    picnicEnabled = defaults.bool(forKey: "menufit.picnic-enabled")
    mealNotificationsEnabled = defaults.bool(forKey: "menufit.meal-notifications-enabled")
    refreshAuthState()
  }

  func bootstrapIfNeeded() async {
    guard authGateState == .ready, !didBootstrap else {
      return
    }
    didBootstrap = true
    // Laad profielgegevens van server
    await loadUserProfile()
    await loadHouseholdStatus()
    await syncKcalToHousehold()
    await loadWeekBundle()
    await loadRecipes()
  }

  private func loadUserProfile() async {
    do {
      let me = try await api.fetchMe()
      userProfile = me.profile
      needsOnboarding = (me.onboardingCompletedAt == nil)
      // Pas kcal selectie aan op profiel
      if let kcal = me.profile?.kcalGoal, kcal > 0 {
        selection.kcal = kcal
      }
    } catch {
      // Stille fout: profiel laden is niet kritiek
    }
  }

  func setPicnicEnabled(_ enabled: Bool) {
    picnicEnabled = enabled
    defaults.set(enabled, forKey: "menufit.picnic-enabled")
  }

  func setMealNotificationsEnabled(_ enabled: Bool) {
    mealNotificationsEnabled = enabled
    defaults.set(enabled, forKey: "menufit.meal-notifications-enabled")
  }

  /// Herplan alle maaltijdnotificaties en werk widget data bij.
  func rescheduleMealNotifications() async {
    guard mealNotificationsEnabled else { return }
    let meals = (summary?.meals ?? []).map { meal in
      MealDayEntry(
        dayLabel: meal.dayLabel,
        mealLabel: meal.mealLabel,
        recipeName: meal.recipeName,
        kcal: meal.kcal
      )
    }
    let schedule = MealSchedule.load(defaults: defaults)
    await MealNotificationManager.shared.scheduleMealNotifications(
      meals: meals,
      schedule: schedule
    )
  }

  /// Schrijf huidige dagdata naar App Group voor de widget.
  private func updateWidgetData() {
    let schedule = MealSchedule.load(defaults: defaults)
    let todayLabel = todayDayLabel()
    let todayMeals = (summary?.meals ?? [])
      .filter { normalizeDayLabel($0.dayLabel) == normalizeDayLabel(todayLabel) }

    let widgetMeals = todayMeals.map { meal -> WidgetMealEntry in
      let moment = schedule.momentForMealLabel(meal.mealLabel)
      return WidgetMealEntry(
        mealId: meal.mealId,
        mealLabel: meal.mealLabel,
        recipeName: meal.recipeName,
        imageUrl: meal.imageUrl,
        kcal: meal.kcal,
        scheduledHour: moment?.hour,
        scheduledMinute: moment?.minute
      )
    }
    WidgetDataWriter.writeTodayMeals(
      widgetMeals,
      dayLabel: todayLabel,
      year: selection.year,
      week: selection.week
    )

    // Grocery summary
    if let groceries {
      let checked = checkedGroceryItemIds.count
      let total = groceries.groceries.count
      let top = groceries.groceries.prefix(5).map(\.canonicalName)
      WidgetDataWriter.writeGrocerySummary(
        WidgetGrocerySummary(totalItems: total, checkedItems: checked, topItems: top)
      )
    }
  }

  /// Zoek een recept op in de geladen receptenlijst (voor fallback ingrediënten/stappen)
  func findRecipe(byId recipeId: String) -> UserRecipeRecord? {
    recipes.first(where: { $0.recipeId == recipeId })
  }

  func refreshAuthState() {
    switch authStore.currentState() {
    case .missing:
      authSession = nil
      authGateState = .onboarding
      didBootstrap = false
    case let .expired(session):
      authSession = session
      authGateState = .expired
      preloadAuthDraft(from: session)
      didBootstrap = false
    case let .valid(session):
      authSession = session
      authGateState = .ready
      preloadAuthDraft(from: session)
    }
  }

  func saveAuthSessionFromDraft() -> Bool {
    let token = authDraft.accessToken.trimmingCharacters(in: .whitespacesAndNewlines)
    let subjectId = authDraft.subjectId.trimmingCharacters(in: .whitespacesAndNewlines)
    let picnicAccountId = authDraft.picnicAccountId.trimmingCharacters(in: .whitespacesAndNewlines)
    let householdId = authDraft.householdId.trimmingCharacters(in: .whitespacesAndNewlines)
    let expiryText = authDraft.expiresAtEpochText.trimmingCharacters(in: .whitespacesAndNewlines)

    guard !token.isEmpty else {
      lastError = AppStrings.text(.onboardingTokenRequired)
      return false
    }
    guard !subjectId.isEmpty else {
      lastError = AppStrings.text(.onboardingSubjectRequired)
      return false
    }
    guard !picnicAccountId.isEmpty else {
      lastError = AppStrings.text(.onboardingPicnicRequired)
      return false
    }
    guard !householdId.isEmpty else {
      lastError = AppStrings.text(.onboardingHouseholdRequired)
      return false
    }

    var expiry: Int?
    if !expiryText.isEmpty {
      guard let parsed = Int(expiryText), parsed > 0 else {
        lastError = AppStrings.text(.onboardingExpiryInvalid)
        return false
      }
      expiry = parsed
    }

    authStore.save(
      session: UserAuthSession(
        accessToken: token,
        subjectId: subjectId,
        picnicAccountId: picnicAccountId,
        householdId: householdId,
        expiresAtEpochSeconds: expiry
      )
    )

    clearLoadedData()
    lastError = nil
    refreshAuthState()
    return true
  }

  func clearAuthSession() {
    authStore.clear()
    clearLoadedData()
    refreshAuthState()
    lastError = nil
  }

  func loadWeekBundle() async {
    guard authGateState == .ready else {
      lastError = AppStrings.text(.authSessionRequired)
      return
    }

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
      updateDaySelectionAfterWeekLoad()
      loadChecklistProgress()
      updateWidgetData()
      await rescheduleMealNotifications()

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
        updateDaySelectionAfterWeekLoad()
        loadChecklistProgress()
        updateWidgetData()
        await rescheduleMealNotifications()
        lastError = AppStrings.text(.offlineDataLoaded, error.localizedDescription)
      } catch {
        lastError = AppStrings.text(.loadWeekOnlineOrOfflineFailed)
      }
    }
  }

  func setPreferredKcal(_ kcal: Int) {
    guard fixedKcals.contains(kcal) else { return }
    selection.kcal = kcal
    defaults.set(kcal, forKey: "menufit.preferred-kcal")
    Task {
      await syncKcalToHousehold()
      await loadWeekBundle()
    }
  }

  func toggleFavorite(_ recipeId: String) {
    if favoriteRecipeIds.contains(recipeId) {
      favoriteRecipeIds.remove(recipeId)
    } else {
      favoriteRecipeIds.insert(recipeId)
    }
    defaults.set(Array(favoriteRecipeIds).sorted(), forKey: "menufit.favorite-recipes")
  }

  func isFavorite(_ recipeId: String) -> Bool {
    favoriteRecipeIds.contains(recipeId)
  }

  func selectMember(_ memberId: String) {
    guard selectedMemberId != memberId else {
      return
    }
    selectedMemberId = memberId
    checkedGroceryItemIds = []
    Task {
      await loadWeekBundle()
    }
  }

  func selectDay(_ dayLabel: String) {
    selectedDayLabel = dayLabel
  }

  func goToPreviousWeek() {
    if selection.week == 1 {
      selection.week = 53
      selection.year -= 1
    } else {
      selection.week -= 1
    }
    checkedGroceryItemIds = []
    Task {
      await loadWeekBundle()
    }
  }

  func goToNextWeek() {
    if selection.week >= 53 {
      selection.week = 1
      selection.year += 1
    } else {
      selection.week += 1
    }
    checkedGroceryItemIds = []
    Task {
      await loadWeekBundle()
    }
  }

  func goToCurrentWeek() {
    let cal = Calendar(identifier: .iso8601)
    let now = Date()
    selection.week = cal.component(.weekOfYear, from: now)
    selection.year = cal.component(.yearForWeekOfYear, from: now)
    checkedGroceryItemIds = []
    Task { await loadWeekBundle() }
  }

  func goToToday() {
    selectedDayLabel = todayDayLabel()
  }

  var isCurrentWeekSelected: Bool {
    let cal = Calendar(identifier: .iso8601)
    let now = Date()
    let week = cal.component(.weekOfYear, from: now)
    let year = cal.component(.yearForWeekOfYear, from: now)
    return selection.week == week && selection.year == year
  }

  var upcomingDayCards: [DayCard] {
    let meals = summary?.meals ?? []
    return availableDayLabels.map { dayLabel in
      let dayMeals = meals.filter { normalizeDayLabel($0.dayLabel) == normalizeDayLabel(dayLabel) }
      return DayCard(dayLabel: dayLabel, meals: dayMeals)
    }
  }

  var filteredRecipes: [UserRecipeRecord] {
    if recipesSearchText.isEmpty { return recipes }
    return recipes.filter { $0.name.localizedCaseInsensitiveContains(recipesSearchText) }
  }

  func loadRecipes() async {
    guard authGateState == .ready else { return }
    isRecipesLoading = true
    defer { isRecipesLoading = false }
    do {
      recipes = try await api.fetchRecipes()
    } catch {
      lastError = "Recepten laden mislukt: \(error.localizedDescription)"
    }
  }

  func toggleGroceryChecked(_ groceryName: String) {
    if checkedGroceryItemIds.contains(groceryName) {
      checkedGroceryItemIds.remove(groceryName)
    } else {
      checkedGroceryItemIds.insert(groceryName)
    }
    persistChecklistProgress()
  }

  func isGroceryChecked(_ groceryName: String) -> Bool {
    checkedGroceryItemIds.contains(groceryName)
  }

  var groceryProgress: (done: Int, total: Int) {
    let total = groceries?.groceries.count ?? 0
    let done = checkedGroceryItemIds.count
    return (done, total)
  }

  var groceryGroups: [String: [GoldGroceryTotalView]] {
    let items = groceries?.groceries ?? []
    return Dictionary(grouping: items, by: { groceryCategory(for: $0.canonicalName) })
  }

  func syncCartOnlineOnly() async {
    guard authGateState == .ready else {
      lastError = AppStrings.text(.authSessionRequired)
      return
    }

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
      lastSyncReport = nil
      lastError = AppStrings.text(.cartSyncFailedOnlineOnly, error.localizedDescription)
    }
  }

  var orderExpectedActionText: String {
    guard let summary else {
      return AppStrings.text(.orderExpectedActionReview)
    }
    if summary.cartPlan.unresolvedCount > 0 {
      return AppStrings.text(.orderExpectedActionReview)
    }
    return AppStrings.text(.orderExpectedActionExecute)
  }

  var orderSyncOutcome: OrderSyncOutcome? {
    if let report = lastSyncReport {
      if report.failedCount > 0 {
        return .partialFailure
      }
      return .success
    }
    if lastError != nil {
      return .failed
    }
    return nil
  }

  func loadMatchQueue() async {
    guard authGateState == .ready else {
      lastError = AppStrings.text(.authSessionRequired)
      return
    }

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
    guard authGateState == .ready else {
      lastError = AppStrings.text(.authSessionRequired)
      return
    }

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
    guard authGateState == .ready else {
      lastError = AppStrings.text(.authSessionRequired)
      return
    }

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

  // MARK: - Auth (username/password flow)

  /// Nieuw: onboarding voltooid na registratie? Stel in vanuit onboarding flow.
  @Published var needsOnboarding = false
  @Published var userProfile: UserProfileData?
  @Published var suggestedKcal: Int?

  func loginWithCredentials(username: String, password: String) async {
    lastError = nil
    do {
      let response = try await api.login(username: username, password: password)
      let session = UserAuthSession(
        accessToken: response.token,
        subjectId: response.userId,
        picnicAccountId: "no-picnic",
        householdId: "",
        expiresAtEpochSeconds: response.expiresAtEpochSeconds,
        username: response.username
      )
      authStore.save(session: session)
      userProfile = response.profile
      needsOnboarding = (response.onboardingCompletedAt == nil)
      clearLoadedData()
      refreshAuthState()
      await bootstrapIfNeeded()
    } catch {
      lastError = error.localizedDescription
    }
  }

  func registerWithCredentials(username: String, password: String, email: String? = nil, profile: UserProfileData? = nil) async {
    lastError = nil
    do {
      let response = try await api.register(username: username, password: password, email: email, profile: profile)
      let session = UserAuthSession(
        accessToken: response.token,
        subjectId: response.userId,
        picnicAccountId: "no-picnic",
        householdId: "",
        expiresAtEpochSeconds: response.expiresAtEpochSeconds,
        username: response.username
      )
      authStore.save(session: session)
      userProfile = response.profile
      needsOnboarding = true
      clearLoadedData()
      refreshAuthState()
    } catch {
      lastError = error.localizedDescription
    }
  }

  func updateUserProfile(_ update: ProfileUpdateRequest) async {
    lastError = nil
    do {
      let result = try await api.updateProfile(update)
      userProfile = result.profile
    } catch {
      lastError = error.localizedDescription
    }
  }

  func fetchSuggestedKcal(birthYear: Int?, gender: String?, weightKg: Double?, heightCm: Double?, activityLevel: String?) async {
    do {
      let result = try await api.suggestKcal(
        KcalSuggestionRequest(
          birthYear: birthYear,
          gender: gender,
          weightKg: weightKg,
          heightCm: heightCm,
          activityLevel: activityLevel
        )
      )
      suggestedKcal = result.suggestedKcal
    } catch {
      // Stille fout; suggestie is optioneel
      suggestedKcal = nil
    }
  }

  func completeOnboardingFlow() async {
    do {
      _ = try await api.completeOnboarding()
      needsOnboarding = false
      await bootstrapIfNeeded()
    } catch {
      lastError = error.localizedDescription
    }
  }

  // MARK: - Config: Household

  func createNewHousehold() async {
    isConfigLoading = true
    configMessage = nil
    defer { isConfigLoading = false }
    do {
      configHousehold = try await api.createHousehold()
      configMessage = "Gezin aangemaakt! Deel de code met familieleden."
    } catch {
      lastError = error.localizedDescription
    }
  }

  func joinHouseholdByCode(_ code: String) async {
    isConfigLoading = true
    configMessage = nil
    defer { isConfigLoading = false }
    do {
      let result = try await api.joinHousehold(code: code)
      configMessage = "Je bent gekoppeld aan gezin \(result.householdId)."
      await loadHouseholdStatus()
    } catch {
      lastError = error.localizedDescription
    }
  }

  func renameHousehold(_ name: String) async {
    guard let household = configHouseholdRecord else { return }
    isConfigLoading = true
    configMessage = nil
    defer { isConfigLoading = false }
    do {
      _ = try await api.renameHousehold(householdId: household.householdId, name: name)
      configMessage = "Gezinsnaam bijgewerkt."
      await loadHouseholdStatus()
    } catch {
      lastError = error.localizedDescription
    }
  }

  func removeMember(userId: String) async {
    guard let household = configHouseholdRecord else { return }
    isConfigLoading = true
    configMessage = nil
    defer { isConfigLoading = false }
    do {
      _ = try await api.removeMember(householdId: household.householdId, userId: userId)
      configMessage = "Lid verwijderd."
      await loadHouseholdStatus()
    } catch {
      lastError = error.localizedDescription
    }
  }

  func leaveHousehold() async {
    isConfigLoading = true
    configMessage = nil
    defer { isConfigLoading = false }
    do {
      _ = try await api.leaveHousehold()
      configMessage = "Je hebt het gezin verlaten."
      configHouseholdRecord = nil
      configHousehold = nil
      await loadHouseholdStatus()
    } catch {
      lastError = error.localizedDescription
    }
  }

  func deleteAccount() async {
    isConfigLoading = true
    configMessage = nil
    defer { isConfigLoading = false }
    do {
      _ = try await api.deleteAccount()
      clearAuthSession()
    } catch {
      lastError = error.localizedDescription
    }
  }

  func syncKcalToHousehold() async {
    do {
      _ = try await api.setMemberKcal(kcal: selection.kcal)
    } catch {
      // Niet-kritiek: stil negeren als backend onbereikbaar is
    }
  }

  func loadHouseholdGroceries() async {
    guard authGateState == .ready else { return }
    do {
      householdGroceries = try await api.fetchHouseholdGroceries(
        year: selection.year,
        week: selection.week,
        basePersons: selection.basePersons
      )
    } catch {
      householdGroceries = nil
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

  private func preloadAuthDraft(from session: UserAuthSession) {
    authDraft = AuthSessionDraft(
      accessToken: session.accessToken,
      subjectId: session.subjectId,
      picnicAccountId: session.picnicAccountId,
      householdId: session.householdId,
      expiresAtEpochText: session.expiresAtEpochSeconds.map(String.init) ?? ""
    )
  }

  private func clearLoadedData() {
    summary = nil
    groceries = nil
    matchQueue = []
    lastSyncReport = nil
    lastMatchEvaluation = nil
    lastMatchReview = nil
    isUsingOfflineCache = false
    householdMembers = []
    selectedMemberId = ""
    selectedDayLabel = ""
    checkedGroceryItemIds = []
    recipes = []
    recipesSearchText = ""
    configHouseholdRecord = nil
    householdGroceries = nil
    didBootstrap = false
  }

  func loadHouseholdStatus() async {
    guard authGateState == .ready else {
      return
    }

    do {
      let response = try await api.fetchHouseholdStatus()
      let members = response.household?.members ?? []
      householdMembers = members
      configHouseholdRecord = response.household

      if selectedMemberId.isEmpty {
        let currentSubject = authSession?.subjectId ?? authDraft.subjectId
        selectedMemberId = members.first(where: { $0.userId == currentSubject })?.userId
          ?? members.first?.userId
          ?? currentSubject
      }
    } catch {
      let fallbackMember = HouseholdMember(
        userId: authSession?.subjectId ?? authDraft.subjectId,
        role: "head",
        joinedAt: "",
        displayName: authSession?.username,
        kcalPreference: nil
      )
      householdMembers = [fallbackMember]
      configHouseholdRecord = nil
      if selectedMemberId.isEmpty {
        selectedMemberId = fallbackMember.userId
      }
    }
  }

  var availableDayLabels: [String] {
    let meals = summary?.meals ?? []
    var seen = Set<String>()
    var unordered: [String] = []
    for meal in meals {
      let normalized = normalizeDayLabel(meal.dayLabel)
      if seen.insert(normalized).inserted {
        unordered.append(meal.dayLabel)
      }
    }
    let order: [String: Int] = [
      "maandag": 0, "dinsdag": 1, "woensdag": 2, "donderdag": 3,
      "vrijdag": 4, "zaterdag": 5, "zondag": 6,
    ]
    return unordered.sorted {
      let a = order[normalizeDayLabel($0)] ?? 99
      let b = order[normalizeDayLabel($1)] ?? 99
      return a < b
    }
  }

  var selectedDayMeals: [GoldWeekMealView] {
    guard !selectedDayLabel.isEmpty else {
      return []
    }
    return (summary?.meals ?? []).filter { normalizeDayLabel($0.dayLabel) == normalizeDayLabel(selectedDayLabel) }
  }

  private func updateDaySelectionAfterWeekLoad() {
    let dayLabels = availableDayLabels
    guard !dayLabels.isEmpty else {
      selectedDayLabel = todayDayLabel()
      return
    }

    if dayLabels.contains(where: { normalizeDayLabel($0) == normalizeDayLabel(selectedDayLabel) }) {
      return
    }

    if let todayMatch = dayLabels.first(where: { normalizeDayLabel($0) == normalizeDayLabel(todayDayLabel()) }) {
      selectedDayLabel = todayMatch
    } else {
      selectedDayLabel = dayLabels[0]
    }
  }

  private func todayDayLabel() -> String {
    let weekday = Calendar(identifier: .gregorian).component(.weekday, from: Date())
    switch weekday {
    case 2: return "maandag"
    case 3: return "dinsdag"
    case 4: return "woensdag"
    case 5: return "donderdag"
    case 6: return "vrijdag"
    case 7: return "zaterdag"
    case 1: return "zondag"
    default: return "maandag"
    }
  }

  private func normalizeDayLabel(_ value: String) -> String {
    value
      .lowercased()
      .folding(options: [.diacriticInsensitive, .widthInsensitive], locale: Locale(identifier: "nl_NL"))
      .trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private func checklistStorageKey() -> String? {
    guard let weekPlanId = summary?.weekPlan.weekPlanId else {
      return nil
    }
    let member = selectedMemberId.isEmpty ? (authSession?.subjectId ?? "default-member") : selectedMemberId
    return "menufit.grocery-checklist.\(member).\(weekPlanId)"
  }

  private func loadChecklistProgress() {
    guard let key = checklistStorageKey() else {
      checkedGroceryItemIds = []
      return
    }

    let stored = defaults.array(forKey: key) as? [String] ?? []
    let validNames = Set((groceries?.groceries ?? []).map(\.canonicalName))
    checkedGroceryItemIds = Set(stored).intersection(validNames)
  }

  private func persistChecklistProgress() {
    guard let key = checklistStorageKey() else {
      return
    }
    defaults.set(Array(checkedGroceryItemIds).sorted(), forKey: key)
  }

  private func groceryCategory(for canonicalName: String) -> String {
    let value = canonicalName.lowercased()
    if value.contains("tomaat") || value.contains("groente") || value.contains("sla") || value.contains("komkommer") {
      return "Groente"
    }
    if value.contains("appel") || value.contains("banaan") || value.contains("fruit") || value.contains("citroen") {
      return "Fruit"
    }
    if value.contains("melk") || value.contains("yoghurt") || value.contains("kaas") || value.contains("boter") {
      return "Zuivel"
    }
    if value.contains("brood") || value.contains("pasta") || value.contains("rijst") || value.contains("meel") {
      return "Basis"
    }
    return AppStrings.text(.groceriesCategoryOther)
  }

  // MARK: - Eetmeter

  func eetmeterLogin(email: String, password: String) async {
    isEetmeterLoading = true
    eetmeterError = nil
    do {
      let response = try await api.eetmeterLogin(email: email, password: password)
      eetmeterIsIngelogd = response.isIngelogd
      if response.isIngelogd {
        await loadEetmeterDag()
      }
    } catch {
      eetmeterError = error.localizedDescription
    }
    isEetmeterLoading = false
  }

  func loadEetmeterDag(datum: String? = nil) async {
    isEetmeterLoading = true
    eetmeterError = nil
    do {
      let response = try await api.fetchEetmeterDag(datum: datum)
      eetmeterIsIngelogd = response.isIngelogd
      eetmeterDatum = response.datum
      eetmeterDag = response.dag
    } catch {
      eetmeterError = error.localizedDescription
    }
    isEetmeterLoading = false
  }

  func eetmeterVorigeDag() async {
    guard !eetmeterDatum.isEmpty else {
      await loadEetmeterDag()
      return
    }
    if let date = isoDate(from: eetmeterDatum) {
      let vorige = Calendar.current.date(byAdding: .day, value: -1, to: date)!
      await loadEetmeterDag(datum: isoString(from: vorige))
    }
  }

  func eetmeterVolgendeDag() async {
    guard !eetmeterDatum.isEmpty else { return }
    if let date = isoDate(from: eetmeterDatum) {
      let volgende = Calendar.current.date(byAdding: .day, value: 1, to: date)!
      guard volgende <= Date() else { return }
      await loadEetmeterDag(datum: isoString(from: volgende))
    }
  }

  private func isoDate(from string: String) -> Date? {
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd"
    f.locale = Locale(identifier: "nl_NL")
    return f.date(from: string)
  }

  private func isoString(from date: Date) -> String {
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd"
    return f.string(from: date)
  }
}
