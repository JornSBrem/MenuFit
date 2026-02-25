import Foundation

enum UITestMockScenario: String {
  case success = "success"
  case weekFailure = "week_failure"
}

final class UITestNetworkMockURLProtocol: URLProtocol {
  static var scenario: UITestMockScenario = .success

  override class func canInit(with request: URLRequest) -> Bool {
    guard let url = request.url else {
      return false
    }
    return url.host == "mock.local"
  }

  override class func canonicalRequest(for request: URLRequest) -> URLRequest {
    request
  }

  override func startLoading() {
    guard let url = request.url else {
      sendError(statusCode: 400, code: "BAD_REQUEST", message: "Missing URL")
      return
    }

    let path = url.path
    let method = request.httpMethod?.uppercased() ?? "GET"

    if UITestNetworkMockURLProtocol.scenario == .weekFailure,
       method == "GET",
       path == "/api/v3/week/summary"
    {
      sendError(
        statusCode: 500,
        code: "WEEK_FETCH_FAILED",
        message: "Gesimuleerde weekfout voor E2E test.",
        hint: "week_failure"
      )
      return
    }

    switch (method, path) {
    case ("GET", "/api/v3/week/summary"):
      sendSuccess(data: [
        "weekPlan": [
          "weekPlanId": "mock-weekplan-9",
          "year": 2026,
          "week": 9,
          "kcal": 1800,
          "basePersons": 2,
          "mealCount": 7,
          "sourceObjectId": "bronze-mock-9",
          "transformVersion": "gold-v1",
          "generatedAt": "2026-02-25T00:00:00.000Z",
        ],
        "matchStatus": [
          "totalItems": 4,
          "resolvedItems": 3,
          "unresolvedItems": 1,
          "coverageScore": 0.75,
        ],
        "cartPlan": [
          "cartPlanId": "mock-cartplan-9",
          "weekPlanId": "mock-weekplan-9",
          "itemCount": 5,
          "unresolvedCount": 1,
          "generatedAt": "2026-02-25T00:00:00.000Z",
        ],
      ])
    case ("GET", "/api/v3/week/groceries"):
      sendSuccess(data: [
        "weekPlanId": "mock-weekplan-9",
        "groceries": [
          [
            "canonicalName": "Paprika",
            "totalAmount": 2.0,
            "unit": "st",
            "requiresReview": false,
          ],
          [
            "canonicalName": "Tomaat",
            "totalAmount": 4.0,
            "unit": "st",
            "requiresReview": true,
          ],
        ],
        "reconcile": [
          [
            "canonicalName": "Paprika",
            "reconcileStatus": "matched",
            "note": "",
          ],
          [
            "canonicalName": "Tomaat",
            "reconcileStatus": "review",
            "note": "Mock review nodig",
          ],
        ],
      ])
    case ("GET", "/api/v3/match/queue"):
      sendSuccess(data: [
        [
          "itemId": "tomaat",
          "sourceRef": "mock-weekplan-9",
          "query": "Tomaat",
          "status": "open",
          "decision": "review",
          "suggestedCandidateId": "tomaat-roma",
          "selectedCandidateId": NSNull(),
          "createdAt": "2026-02-25T00:00:00.000Z",
          "updatedAt": "2026-02-25T00:00:00.000Z",
        ],
      ])
    case ("POST", "/api/v3/match/evaluate"):
      sendSuccess(data: [
        "evaluation": [
          "itemId": "tomaat",
          "sourceRef": "mock-weekplan-9",
          "decision": "high",
          "policy": "baseline",
          "rankedCandidates": [
            [
              "candidate": [
                "candidateId": "tomaat-roma",
                "label": "Tomaat Roma",
                "canonicalLabel": "tomaat roma",
              ],
              "breakdown": [
                "finalScore": 0.92,
              ],
            ],
          ],
          "topCandidateId": "tomaat-roma",
          "queuedForReview": false,
        ],
        "finishPass": [
          "attempted": true,
          "usedFallback": false,
          "reason": NSNull(),
          "provider": "mock",
          "suggestedCandidateId": "tomaat-roma",
          "note": "Mock suggestie",
        ],
      ])
    case ("POST", "/api/v3/match/review-action"):
      sendSuccess(data: [
        "queueItem": [
          "itemId": "tomaat",
          "status": "mapped",
          "selectedCandidateId": "tomaat-roma",
        ],
      ])
    case ("POST", "/api/v3/cart/sync"):
      sendSuccess(data: [
        "reportId": "mock-sync-1",
        "idempotencyKey": "mock-weekplan-9-default-household",
        "weekPlanId": "mock-weekplan-9",
        "householdId": "default-household",
        "source": "user",
        "mode": "execute",
        "status": "synced",
        "itemCount": 2,
        "syncedCount": 2,
        "failedCount": 0,
        "idempotentReplay": false,
        "message": "Mock sync voltooid",
        "externalCartId": "mock-cart-99",
        "errors": NSNull(),
        "createdAt": "2026-02-25T00:00:00.000Z",
      ])
    default:
      sendError(statusCode: 404, code: "MOCK_NOT_FOUND", message: "Geen mock response", hint: path)
    }
  }

  override func stopLoading() {}

  private func sendSuccess(data: Any) {
    sendEnvelope(statusCode: 200, envelope: [
      "ok": true,
      "data": data,
      "error": NSNull(),
    ])
  }

  private func sendError(statusCode: Int, code: String, message: String, hint: String? = nil) {
    var errorPayload: [String: Any] = [
      "code": code,
      "message": message,
    ]
    if let hint {
      errorPayload["hint"] = hint
    } else {
      errorPayload["hint"] = NSNull()
    }

    sendEnvelope(statusCode: statusCode, envelope: [
      "ok": false,
      "data": NSNull(),
      "error": errorPayload,
    ])
  }

  private func sendEnvelope(statusCode: Int, envelope: [String: Any]) {
    guard let url = request.url,
          let data = try? JSONSerialization.data(withJSONObject: envelope)
    else {
      client?.urlProtocol(self, didFailWithError: URLError(.cannotParseResponse))
      client?.urlProtocolDidFinishLoading(self)
      return
    }

    let response = HTTPURLResponse(
      url: url,
      statusCode: statusCode,
      httpVersion: nil,
      headerFields: ["Content-Type": "application/json"]
    )!

    client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
    client?.urlProtocol(self, didLoad: data)
    client?.urlProtocolDidFinishLoading(self)
  }
}

struct UITestNetworkSessionFactory {
  static func makeSessionIfEnabled(processInfo: ProcessInfo = .processInfo) -> URLSession? {
    guard let rawScenario = processInfo.environment["MENUFIT_UI_TEST_SCENARIO"]?.trimmingCharacters(in: .whitespacesAndNewlines),
          !rawScenario.isEmpty
    else {
      return nil
    }

    let scenario = UITestMockScenario(rawValue: rawScenario) ?? .success
    UITestNetworkMockURLProtocol.scenario = scenario

    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [UITestNetworkMockURLProtocol.self]
    return URLSession(configuration: configuration)
  }
}
