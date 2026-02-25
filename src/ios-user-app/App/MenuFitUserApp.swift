import SwiftUI

@main
struct MenuFitUserApp: App {
  @StateObject private var viewModel: UserFlowViewModel

  init() {
    let processInfo = ProcessInfo.processInfo
    let environment = AppEnvironment.load(processInfo: processInfo)
    let uiTestSession = UITestNetworkSessionFactory.makeSessionIfEnabled(processInfo: processInfo)
    let authStore = AuthSessionStore(
      defaults: Self.authDefaults(isUITestMode: uiTestSession != nil),
      fallbackSession: environment.defaultSession
    )
    let api = BackendAPI(baseURL: environment.baseURL, session: uiTestSession ?? .shared, tokenProvider: authStore)
    guard let cache = try? OfflineCacheStore() else {
      fatalError("Could not initialize offline cache.")
    }
    if uiTestSession != nil {
      try? cache.clearAll()
    }

    _viewModel = StateObject(
      wrappedValue: UserFlowViewModel(
        api: api,
        cache: cache,
        authStore: authStore,
        fallbackHouseholdId: environment.defaultSession?.householdId ?? "default-household"
      )
    )
  }

  private static func authDefaults(isUITestMode: Bool) -> UserDefaults {
    guard isUITestMode else {
      return .standard
    }
    let suiteName = "menufit.ui-tests"
    guard let defaults = UserDefaults(suiteName: suiteName) else {
      return .standard
    }
    defaults.removePersistentDomain(forName: suiteName)
    return defaults
  }

  var body: some Scene {
    WindowGroup {
      RootTabView()
        .environmentObject(viewModel)
        .task {
          await viewModel.loadWeekBundle()
          await viewModel.loadMatchQueue()
        }
    }
  }
}
