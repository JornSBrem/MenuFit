import Foundation

struct AppEnvironment {
  let baseURL: URL
  let defaultSession: UserAuthSession?

  static func load(bundle: Bundle = .main) -> AppEnvironment {
    let baseURLString = infoString("MenuFitBackendBaseURL", bundle: bundle) ?? "https://api.menufit.local"
    let baseURL = URL(string: baseURLString) ?? URL(string: "https://localhost")!

    let token = infoString("MenuFitUserAccessToken", bundle: bundle)?.trimmingCharacters(in: .whitespacesAndNewlines)
    let subjectId = infoString("MenuFitUserSubjectId", bundle: bundle) ?? "ios-user"
    let picnicAccountId = infoString("MenuFitPicnicAccountId", bundle: bundle) ?? "picnic-default"
    let householdId = infoString("MenuFitHouseholdId", bundle: bundle) ?? "default-household"
    let expiry = infoInt("MenuFitUserTokenExpiryEpochSeconds", bundle: bundle)

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
