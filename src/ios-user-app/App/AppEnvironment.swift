import Foundation

struct AppEnvironment {
  let baseURL: URL
  let supabaseProjectURL: URL?
  let supabaseAnonKey: String?
  let supabaseConfigurationIssue: String?

  static func load(bundle: Bundle = .main) -> AppEnvironment {
    let baseURLString = infoString("MenuFitBackendBaseURL", bundle: bundle) ?? "https://api.menufit.local"
    let baseURL = URL(string: baseURLString) ?? URL(string: "https://localhost")!

    let supabaseURLValue = infoString(
      [
        "SupabaseProjectURL",
        "SupabaseURL",
        "SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_URL"
      ],
      bundle: bundle
    )
    let supabaseProjectURL = parseSupabaseURL(supabaseURLValue)
    let supabaseAnonKey = infoString(
      [
        "SupabaseAnonKey",
        "SupabaseAnonkey",
        "SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      ],
      bundle: bundle
    )

    var issues: [String] = []
    if supabaseProjectURL == nil {
      issues.append("URL ontbreekt of is ongeldig (gebruik Info.plist key `SupabaseProjectURL`)")
    }
    if supabaseAnonKey == nil {
      issues.append("Anon key ontbreekt (gebruik Info.plist key `SupabaseAnonKey`)")
    }
    let supabaseConfigurationIssue = issues.isEmpty ? nil : "Supabase configuratie onvolledig: \(issues.joined(separator: ", "))."

    return AppEnvironment(
      baseURL: baseURL,
      supabaseProjectURL: supabaseProjectURL,
      supabaseAnonKey: supabaseAnonKey,
      supabaseConfigurationIssue: supabaseConfigurationIssue
    )
  }

  private static func infoString(_ keys: [String], bundle: Bundle) -> String? {
    for key in keys {
      guard let value = bundle.object(forInfoDictionaryKey: key) as? String else {
        continue
      }
      let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
      if !trimmed.isEmpty {
        // Xcode build settings from xcconfig can contain escaped slashes (https:\\/\\/...)
        return trimmed.replacingOccurrences(of: "\\/", with: "/")
      }
    }
    return nil
  }

  private static func infoString(_ key: String, bundle: Bundle) -> String? {
    infoString([key], bundle: bundle)
  }

  private static func parseSupabaseURL(_ value: String?) -> URL? {
    guard let value else { return nil }
    if let parsed = parseAbsoluteURL(value) {
      return parsed
    }

    // Accept host-only input like "xxxx.supabase.co" by prepending https://
    return parseAbsoluteURL("https://\(value)")
  }

  private static func parseAbsoluteURL(_ value: String) -> URL? {
    guard
      let components = URLComponents(string: value),
      let scheme = components.scheme?.lowercased(),
      (scheme == "https" || scheme == "http"),
      components.host?.isEmpty == false,
      let url = components.url
    else {
      return nil
    }
    return url
  }
}
