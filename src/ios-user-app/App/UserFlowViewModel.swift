import Foundation

@MainActor
final class UserFlowViewModel: ObservableObject {
  @Published var selection = WeekSelection(year: 2026, week: 9, kcal: 1800, basePersons: 2)
  @Published var summary: WeekSummaryResponse?
  @Published var groceries: WeekGroceriesResponse?
  @Published var isUsingOfflineCache = false
  @Published var isLoading = false
  @Published var lastError: String?
  @Published var lastSyncReport: CartSyncReport?

  private let api: BackendAPI
  private let cache: OfflineCacheStore
  private let householdId: String

  init(api: BackendAPI, cache: OfflineCacheStore, householdId: String = "default-household") {
    self.api = api
    self.cache = cache
    self.householdId = householdId
  }

  func loadWeekBundle() async {
    isLoading = true
    defer { isLoading = false }
    lastError = nil

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
}
