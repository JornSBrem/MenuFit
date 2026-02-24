import Foundation

enum BackendAPIError: Error, LocalizedError {
  case invalidBaseURL
  case invalidResponse
  case backend(code: String, message: String, hint: String?)
  case transport(message: String)

  var errorDescription: String? {
    switch self {
    case .invalidBaseURL:
      return "Invalid backend base URL."
    case .invalidResponse:
      return "Backend response could not be parsed."
    case let .backend(code, message, hint):
      return "\(code): \(message)\(hint.map { " (\($0))" } ?? "")"
    case let .transport(message):
      return message
    }
  }
}

final class BackendAPI {
  private let baseURL: URL
  private let session: URLSession
  private let decoder = JSONDecoder()
  private let encoder = JSONEncoder()

  init(baseURL: URL, session: URLSession = .shared) {
    self.baseURL = baseURL
    self.session = session
  }

  func fetchWeekSummary(selection: WeekSelection) async throws -> WeekSummaryResponse {
    try await get(
      path: "/api/v3/week/summary",
      query: [
        URLQueryItem(name: "year", value: String(selection.year)),
        URLQueryItem(name: "week", value: String(selection.week)),
        URLQueryItem(name: "kcal", value: String(selection.kcal)),
        URLQueryItem(name: "basePersons", value: String(selection.basePersons)),
      ]
    )
  }

  func fetchWeekGroceries(selection: WeekSelection) async throws -> WeekGroceriesResponse {
    try await get(
      path: "/api/v3/week/groceries",
      query: [
        URLQueryItem(name: "year", value: String(selection.year)),
        URLQueryItem(name: "week", value: String(selection.week)),
        URLQueryItem(name: "kcal", value: String(selection.kcal)),
        URLQueryItem(name: "basePersons", value: String(selection.basePersons)),
      ]
    )
  }

  func syncCart(body: CartSyncRequestBody) async throws -> CartSyncReport {
    try await post(path: "/api/v3/cart/sync", body: body)
  }

  private func get<T: Decodable>(path: String, query: [URLQueryItem]) async throws -> T {
    guard var components = URLComponents(
      url: baseURL.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))),
      resolvingAgainstBaseURL: false
    ) else {
      throw BackendAPIError.invalidBaseURL
    }
    components.queryItems = query
    guard let url = components.url else {
      throw BackendAPIError.invalidBaseURL
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("application/json", forHTTPHeaderField: "Accept")

    return try await perform(request)
  }

  private func post<TBody: Encodable, TData: Decodable>(path: String, body: TBody) async throws -> TData {
    let url = baseURL.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try encoder.encode(body)

    return try await perform(request)
  }

  private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
    do {
      let (data, response) = try await session.data(for: request)
      guard let httpResponse = response as? HTTPURLResponse else {
        throw BackendAPIError.invalidResponse
      }

      let envelope = try decoder.decode(ApiEnvelope<T>.self, from: data)
      guard httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 else {
        if let payload = envelope.error {
          throw BackendAPIError.backend(code: payload.code, message: payload.message, hint: payload.hint)
        }
        throw BackendAPIError.transport(message: "HTTP \(httpResponse.statusCode)")
      }

      guard envelope.ok, let payload = envelope.data else {
        if let errorPayload = envelope.error {
          throw BackendAPIError.backend(
            code: errorPayload.code,
            message: errorPayload.message,
            hint: errorPayload.hint
          )
        }
        throw BackendAPIError.invalidResponse
      }

      return payload
    } catch {
      if let apiError = error as? BackendAPIError {
        throw apiError
      }
      throw BackendAPIError.transport(message: error.localizedDescription)
    }
  }
}
