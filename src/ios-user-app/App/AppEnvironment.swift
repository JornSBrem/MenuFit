import Foundation

struct AppEnvironment {
  let baseURL: URL
  let defaultSession: UserAuthSession?

  static func load(bundle: Bundle = .main, processInfo: ProcessInfo = .processInfo) -> AppEnvironment {
    let baseURLString = configuredString("MenuFitBackendBaseURL", bundle: bundle, processInfo: processInfo) ?? "https://api.menufit.local"
    let baseURL = URL(string: baseURLString) ?? URL(string: "https://localhost")!

    let token = configuredString("MenuFitUserAccessToken", bundle: bundle, processInfo: processInfo)?
      .trimmingCharacters(in: .whitespacesAndNewlines)
    let subjectId = configuredString("MenuFitUserSubjectId", bundle: bundle, processInfo: processInfo) ?? "ios-user"
    let picnicAccountId = configuredString("MenuFitPicnicAccountId", bundle: bundle, processInfo: processInfo) ?? "picnic-default"
    let householdId = configuredString("MenuFitHouseholdId", bundle: bundle, processInfo: processInfo) ?? "default-household"
    let expiry = configuredInt("MenuFitUserTokenExpiryEpochSeconds", bundle: bundle, processInfo: processInfo)
      .flatMap { $0 > 0 ? $0 : nil }

    let defaultSession: UserAuthSession?
    if let token, !token.isEmpty {
      defaultSession = UserAuthSession(
        accessToken: token,
        subjectId: subjectId,
        picnicAccountId: picnicAccountId,
        householdId: householdId,
        expiresAtEpochSeconds: expiry
      )
    } else {
      defaultSession = nil
    }

    return AppEnvironment(baseURL: baseURL, defaultSession: defaultSession)
  }

  private static func configuredString(_ key: String, bundle: Bundle, processInfo: ProcessInfo) -> String? {
    if let raw = processInfo.environment[key] {
      return raw
    }
    return infoString(key, bundle: bundle)
  }

  private static func configuredInt(_ key: String, bundle: Bundle, processInfo: ProcessInfo) -> Int? {
    if let raw = processInfo.environment[key] {
      return Int(raw)
    }
    return infoInt(key, bundle: bundle)
  }

  private static func infoString(_ key: String, bundle: Bundle) -> String? {
    bundle.object(forInfoDictionaryKey: key) as? String
  }

  private static func infoInt(_ key: String, bundle: Bundle) -> Int? {
    if let number = bundle.object(forInfoDictionaryKey: key) as? NSNumber {
      return number.intValue
    }
    if let raw = bundle.object(forInfoDictionaryKey: key) as? String {
      return Int(raw)
    }
    return nil
  }
}
