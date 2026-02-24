import SwiftUI

@main
struct MenuFitUserApp: App {
  @StateObject private var viewModel: UserFlowViewModel

  init() {
    let environment = AppEnvironment.load()
    let authStore = AuthSessionStore(fallbackSession: environment.defaultSession)
    let api = BackendAPI(baseURL: environment.baseURL, tokenProvider: authStore)
    guard let cache = try? OfflineCacheStore() else {
      fatalError("Could not initialize offline cache.")
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
