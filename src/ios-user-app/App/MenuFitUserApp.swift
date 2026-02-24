import SwiftUI

@main
struct MenuFitUserApp: App {
  @StateObject private var viewModel: UserFlowViewModel

  init() {
    let baseURL = URL(string: "https://api.menufit.local") ?? URL(string: "https://localhost")!
    let api = BackendAPI(baseURL: baseURL)
    guard let cache = try? OfflineCacheStore() else {
      fatalError("Could not initialize offline cache.")
    }
    _viewModel = StateObject(wrappedValue: UserFlowViewModel(api: api, cache: cache))
  }

  var body: some Scene {
    WindowGroup {
      RootTabView()
        .environmentObject(viewModel)
        .task {
          await viewModel.loadWeekBundle()
        }
    }
  }
}
