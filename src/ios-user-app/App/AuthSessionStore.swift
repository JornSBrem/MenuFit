import Foundation

protocol AccessTokenProvider {
  func accessToken() throws -> String
}

enum AuthSessionState {
  case missing
  case expired(UserAuthSession)
  case valid(UserAuthSession)
}

enum AuthSessionStoreError: Error, LocalizedError {
  case missingSession
  case expiredSession

  var errorDescription: String? {
    switch self {
    case .missingSession:
      return AppStrings.text(.authSessionRequired)
    case .expiredSession:
      return AppStrings.text(.authSessionExpired)
    }
  }
}

final class AuthSessionStore: AccessTokenProvider {
  private static let storageKey = "menufit.user-auth-session"

  private let defaults: UserDefaults
  private let encoder = JSONEncoder()
  private let decoder = JSONDecoder()
  private let nowEpochSeconds: () -> Int

  /// Optionele SupabaseAuthClient voor automatische token refresh.
  var supabaseAuthClient: SupabaseAuthClient?

  private(set) var session: UserAuthSession?

  /// True wanneer een refresh al bezig is (voorkomt dubbele refresh calls).
  private var isRefreshing = false

  init(
    defaults: UserDefaults = .standard,
    nowEpochSeconds: @escaping () -> Int = { Int(Date().timeIntervalSince1970) }
  ) {
    self.defaults = defaults
    self.nowEpochSeconds = nowEpochSeconds
    self.session = Self.load(defaults: defaults, decoder: decoder)
  }

  func accessToken() throws -> String {
    guard let session else {
      throw AuthSessionStoreError.missingSession
    }
    if let expiry = session.expiresAtEpochSeconds, expiry <= nowEpochSeconds() {
      throw AuthSessionStoreError.expiredSession
    }
    return session.accessToken
  }

  /// Geeft een geldig access token terug; vernieuwt automatisch als het bijna verloopt.
  func validAccessToken() async throws -> String {
    guard let session else {
      throw AuthSessionStoreError.missingSession
    }

    // Vernieuw als token binnen 5 minuten verloopt
    if let expiry = session.expiresAtEpochSeconds,
       expiry - nowEpochSeconds() < 300,
       !session.refreshToken.isEmpty,
       let client = supabaseAuthClient,
       !isRefreshing {
      isRefreshing = true
      defer { isRefreshing = false }
      do {
        let response = try await client.refreshSession(refreshToken: session.refreshToken)
        let newSession = UserAuthSession(
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          subjectId: response.user.id,
          email: response.user.email,
          expiresAtEpochSeconds: nowEpochSeconds() + response.expires_in,
          username: session.username
        )
        save(session: newSession)
        return newSession.accessToken
      } catch {
        // Refresh mislukt — geef bestaand token terug als het nog geldig is
        if let expiry = session.expiresAtEpochSeconds, expiry <= nowEpochSeconds() {
          throw AuthSessionStoreError.expiredSession
        }
      }
    }

    if let expiry = session.expiresAtEpochSeconds, expiry <= nowEpochSeconds() {
      throw AuthSessionStoreError.expiredSession
    }
    return session.accessToken
  }

  func currentState() -> AuthSessionState {
    guard let session else {
      return .missing
    }
    if let expiry = session.expiresAtEpochSeconds, expiry <= nowEpochSeconds() {
      return .expired(session)
    }
    return .valid(session)
  }

  func save(session: UserAuthSession) {
    guard let payload = try? encoder.encode(session) else {
      return
    }
    defaults.set(payload, forKey: Self.storageKey)
    self.session = session
  }

  func clear() {
    defaults.removeObject(forKey: Self.storageKey)
    session = nil
  }

  private static func load(defaults: UserDefaults, decoder: JSONDecoder) -> UserAuthSession? {
    guard let data = defaults.data(forKey: storageKey) else {
      return nil
    }
    return try? decoder.decode(UserAuthSession.self, from: data)
  }
}
