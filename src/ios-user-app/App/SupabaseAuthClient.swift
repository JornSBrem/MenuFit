import Foundation

// MARK: - Supabase GoTrue REST API Client

enum SupabaseAuthError: Error, LocalizedError {
  case invalidURL
  case invalidResponse
  case serverError(statusCode: Int, message: String)
  case decodingFailed

  var errorDescription: String? {
    switch self {
    case .invalidURL:
      return "Ongeldige Supabase URL."
    case .invalidResponse:
      return "Ongeldig antwoord van Supabase."
    case let .serverError(statusCode, message):
      return "Supabase fout (\(statusCode)): \(message)"
    case .decodingFailed:
      return "Kan antwoord van Supabase niet verwerken."
    }
  }
}

struct SupabaseAuthResponse: Decodable {
  let access_token: String
  let refresh_token: String
  let expires_in: Int
  let token_type: String
  let user: SupabaseUser
}

struct SupabaseUser: Decodable {
  let id: String
  let email: String?
}

struct SupabaseErrorResponse: Decodable {
  let error: String?
  let error_description: String?
  let msg: String?
  let message: String?

  var displayMessage: String {
    error_description ?? msg ?? message ?? error ?? "Onbekende fout."
  }
}

final class SupabaseAuthClient {
  private let projectURL: URL
  private let anonKey: String
  private let session: URLSession
  private let encoder = JSONEncoder()
  private let decoder = JSONDecoder()

  init(projectURL: URL, anonKey: String, session: URLSession = .shared) {
    self.projectURL = projectURL
    self.anonKey = anonKey
    self.session = session
  }

  /// Registreer een nieuwe gebruiker via email + wachtwoord.
  func signUp(email: String, password: String) async throws -> SupabaseAuthResponse {
    let url = projectURL.appendingPathComponent("auth/v1/signup")
    let body: [String: String] = ["email": email, "password": password]
    return try await post(url: url, body: body)
  }

  /// Login met email + wachtwoord.
  func signIn(email: String, password: String) async throws -> SupabaseAuthResponse {
    guard var components = URLComponents(url: projectURL.appendingPathComponent("auth/v1/token"), resolvingAgainstBaseURL: false) else {
      throw SupabaseAuthError.invalidURL
    }
    components.queryItems = [URLQueryItem(name: "grant_type", value: "password")]
    guard let url = components.url else { throw SupabaseAuthError.invalidURL }

    let body: [String: String] = ["email": email, "password": password]
    return try await post(url: url, body: body)
  }

  /// Vernieuw een sessie met een refresh token.
  func refreshSession(refreshToken: String) async throws -> SupabaseAuthResponse {
    guard var components = URLComponents(url: projectURL.appendingPathComponent("auth/v1/token"), resolvingAgainstBaseURL: false) else {
      throw SupabaseAuthError.invalidURL
    }
    components.queryItems = [URLQueryItem(name: "grant_type", value: "refresh_token")]
    guard let url = components.url else { throw SupabaseAuthError.invalidURL }

    let body: [String: String] = ["refresh_token": refreshToken]
    return try await post(url: url, body: body)
  }

  // MARK: - Private

  private func post<TBody: Encodable>(url: URL, body: TBody) async throws -> SupabaseAuthResponse {
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(anonKey, forHTTPHeaderField: "apikey")
    request.httpBody = try encoder.encode(body)

    let (data, response) = try await session.data(for: request)
    guard let httpResponse = response as? HTTPURLResponse else {
      throw SupabaseAuthError.invalidResponse
    }

    guard httpResponse.statusCode >= 200, httpResponse.statusCode < 300 else {
      let errorBody = try? decoder.decode(SupabaseErrorResponse.self, from: data)
      throw SupabaseAuthError.serverError(
        statusCode: httpResponse.statusCode,
        message: errorBody?.displayMessage ?? "HTTP \(httpResponse.statusCode)"
      )
    }

    do {
      return try decoder.decode(SupabaseAuthResponse.self, from: data)
    } catch {
      throw SupabaseAuthError.decodingFailed
    }
  }
}
