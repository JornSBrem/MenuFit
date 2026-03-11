import SwiftUI

@main
struct MenuFitUserApp: App {
  @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
  @StateObject private var viewModel: UserFlowViewModel

  init() {
    let environment = AppEnvironment.load()
    let authStore = AuthSessionStore()

    // Maak SupabaseAuthClient aan als geconfigureerd
    var supabaseAuth: SupabaseAuthClient?
    if let supabaseURL = environment.supabaseProjectURL,
       let anonKey = environment.supabaseAnonKey, !anonKey.isEmpty {
      supabaseAuth = SupabaseAuthClient(projectURL: supabaseURL, anonKey: anonKey)
      authStore.supabaseAuthClient = supabaseAuth
    } else if let issue = environment.supabaseConfigurationIssue {
      print("[boot] \(issue)")
    }

    let api = BackendAPI(baseURL: environment.baseURL, tokenProvider: authStore)
    guard let cache = try? OfflineCacheStore() else {
      fatalError("Could not initialize offline cache.")
    }

    _viewModel = StateObject(
      wrappedValue: UserFlowViewModel(
        api: api,
        cache: cache,
        authStore: authStore,
        supabaseAuth: supabaseAuth,
        supabaseConfigurationIssue: environment.supabaseConfigurationIssue
      )
    )
  }

  var body: some Scene {
    WindowGroup {
      AppRootView()
        .environmentObject(viewModel)
    }
  }
}

private struct AppRootView: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  var body: some View {
    Group {
      if viewModel.authGateState == .ready {
        RootTabView()
          .task {
            await viewModel.bootstrapIfNeeded()
          }
          .transition(.opacity.combined(with: .move(edge: .trailing)))
      } else {
        AuthSessionSetupView()
          .transition(.opacity.combined(with: .move(edge: .leading)))
      }
    }
    .animation(.easeInOut(duration: 0.35), value: viewModel.authGateState == .ready)
  }
}
