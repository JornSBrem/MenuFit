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

  private(set) var session: UserAuthSession?

  init(
    defaults: UserDefaults = .standard,
    nowEpochSeconds: @escaping () -> Int = { Int(Date().timeIntervalSince1970) },
    fallbackSession: UserAuthSession? = nil
  ) {
    self.defaults = defaults
    self.nowEpochSeconds = nowEpochSeconds
    self.session = Self.load(defaults: defaults, decoder: decoder)

    if session == nil, let fallbackSession {
      save(session: fallbackSession)
    }
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
