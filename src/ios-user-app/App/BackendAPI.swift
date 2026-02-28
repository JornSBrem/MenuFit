import Foundation

enum BackendAPIError: Error, LocalizedError {
  case invalidBaseURL
  case invalidResponse
  case authorization(message: String)
  case backend(code: String, message: String, hint: String?)
  case transport(message: String)

  var errorDescription: String? {
    switch self {
    case .invalidBaseURL:
      return AppStrings.text(.backendInvalidBaseUrl)
    case .invalidResponse:
      return AppStrings.text(.backendInvalidResponse)
    case let .authorization(message):
      return AppStrings.text(.authAuthorizationFailed, message)
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
  private let tokenProvider: AccessTokenProvider

  init(baseURL: URL, session: URLSession = .shared, tokenProvider: AccessTokenProvider) {
    self.baseURL = baseURL
    self.session = session
    self.tokenProvider = tokenProvider
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

  func fetchMatchQueue() async throws -> [MatchReviewQueueItem] {
    try await get(path: "/api/v3/match/queue")
  }

  func fetchHouseholdStatus() async throws -> HouseholdStatusResponse {
    try await get(path: "/api/v3/household/me")
  }

  func evaluateMatch(body: MatchEvaluateRequestBody) async throws -> MatchWorkflowEvaluateResponse {
    try await post(path: "/api/v3/match/evaluate", body: body)
  }

  func applyMatchReviewAction(body: MatchReviewActionRequestBody) async throws -> MatchReviewActionResponse {
    try await post(path: "/api/v3/match/review-action", body: body)
  }

  func syncCart(body: CartSyncRequestBody) async throws -> CartSyncReport {
    try await post(path: "/api/v3/cart/sync", body: body)
  }

  func fetchRecipes() async throws -> [UserRecipeRecord] {
    try await get(path: "/api/v3/recipes")
  }

  // MARK: - Auth endpoints (geen bearer token nodig)

  func register(username: String, password: String) async throws -> AuthTokenResponse {
    try await postPublic(path: "/api/v3/auth/register", body: AuthRegisterRequest(username: username, password: password))
  }

  func login(username: String, password: String) async throws -> AuthTokenResponse {
    try await postPublic(path: "/api/v3/auth/login", body: AuthLoginRequest(username: username, password: password))
  }

  func fetchMe() async throws -> AuthMeResponse {
    try await get(path: "/api/v3/auth/me")
  }

  // MARK: - Household endpoints

  func createHousehold() async throws -> HouseholdCreateResponse {
    try await post(path: "/api/v3/household/create", body: EmptyBody())
  }

  func joinHousehold(code: String) async throws -> HouseholdJoinResponse {
    try await post(path: "/api/v3/household/join-by-code", body: HouseholdJoinRequest(code: code))
  }

  func renameHousehold(householdId: String, name: String) async throws -> HouseholdRenameResponse {
    try await post(path: "/api/v3/household/rename", body: HouseholdRenameRequest(householdId: householdId, name: name))
  }

  func setMemberKcal(kcal: Int) async throws -> HouseholdSetKcalResponse {
    try await post(path: "/api/v3/household/set-member-kcal", body: HouseholdSetKcalRequest(kcal: kcal))
  }

  func fetchHouseholdGroceries(year: Int, week: Int, basePersons: Int) async throws -> HouseholdGroceriesResponse {
    try await get(
      path: "/api/v3/household/groceries",
      query: [
        URLQueryItem(name: "year", value: String(year)),
        URLQueryItem(name: "week", value: String(week)),
        URLQueryItem(name: "basePersons", value: String(basePersons)),
      ]
    )
  }

  func removeMember(householdId: String, userId: String) async throws -> HouseholdRemoveMemberResponse {
    try await post(path: "/api/v3/household/remove-member", body: HouseholdRemoveMemberRequest(householdId: householdId, userId: userId))
  }

  func leaveHousehold() async throws -> HouseholdLeaveResponse {
    try await post(path: "/api/v3/household/leave", body: EmptyBody())
  }

  func deleteAccount() async throws -> AccountDeleteResponse {
    try await post(path: "/api/v3/auth/delete-account", body: EmptyBody())
  }

  private func get<T: Decodable>(path: String, query: [URLQueryItem] = []) async throws -> T {
    guard var components = URLComponents(
      url: baseURL.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))),
      resolvingAgainstBaseURL: false
    ) else {
      throw BackendAPIError.invalidBaseURL
    }
    components.queryItems = query.isEmpty ? nil : query
    guard let url = components.url else {
      throw BackendAPIError.invalidBaseURL
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    try applyAuthorization(to: &request)

    return try await perform(request)
  }

  private func post<TBody: Encodable, TData: Decodable>(path: String, body: TBody) async throws -> TData {
    let url = baseURL.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    try applyAuthorization(to: &request)
    request.httpBody = try encoder.encode(body)

    return try await perform(request)
  }

  /// POST zonder Authorization header (voor login/register endpoints)
  private func postPublic<TBody: Encodable, TData: Decodable>(path: String, body: TBody) async throws -> TData {
    let url = baseURL.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try encoder.encode(body)

    return try await perform(request)
  }

  private func applyAuthorization(to request: inout URLRequest) throws {
    do {
      let token = try tokenProvider.accessToken().trimmingCharacters(in: .whitespacesAndNewlines)
      if token.isEmpty {
        throw BackendAPIError.authorization(message: AppStrings.text(.authSessionRequired))
      }
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    } catch let error as AuthSessionStoreError {
      throw BackendAPIError.authorization(message: error.localizedDescription)
    } catch let error as BackendAPIError {
      throw error
    } catch {
      throw BackendAPIError.authorization(message: error.localizedDescription)
    }
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
