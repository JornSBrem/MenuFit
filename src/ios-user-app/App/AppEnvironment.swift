import Foundation

struct AppEnvironment {
  let baseURL: URL
  let supabaseProjectURL: URL?
  let supabaseAnonKey: String?

  static func load(bundle: Bundle = .main) -> AppEnvironment {
    let baseURLString = infoString("MenuFitBackendBaseURL", bundle: bundle) ?? "https://api.menufit.local"
    let baseURL = URL(string: baseURLString) ?? URL(string: "https://localhost")!

    let supabaseURLString = infoString("SupabaseProjectURL", bundle: bundle)
    let supabaseProjectURL = supabaseURLString.flatMap { URL(string: $0) }
    let supabaseAnonKey = infoString("SupabaseAnonKey", bundle: bundle)

    return AppEnvironment(
      baseURL: baseURL,
      supabaseProjectURL: supabaseProjectURL,
      supabaseAnonKey: supabaseAnonKey
    )
  }

  private static func infoString(_ key: String, bundle: Bundle) -> String? {
    bundle.object(forInfoDictionaryKey: key) as? String
  }
}
