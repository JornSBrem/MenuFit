# WI-228 Changes

## Summary

- Added deterministic iOS UI end-to-end execution with in-app network virtualization for UITest mode.
- Expanded UI suite with mocked success and failure scenarios for the core Week -> Match -> Bestellen flow.
- Added runtime overrides and test-state isolation to keep E2E runs reproducible across local and CI runs.

## Files

- `src/ios-user-app/App/UITestNetworkMock.swift`
  - Added `URLProtocol`-based backend virtualization for week, match, and cart endpoints.
  - Added scenario switch via `MENUFIT_UI_TEST_SCENARIO` (`success`, `week_failure`).
- `src/ios-user-app/App/AppEnvironment.swift`
  - Added process environment overrides for backend URL and default auth session keys.
  - Normalized non-positive token expiry values to `nil` for deterministic test auth setup.
- `src/ios-user-app/App/MenuFitUserApp.swift`
  - Wired optional UITest session into `BackendAPI`.
  - Isolated auth defaults storage in UITest mode and reset offline cache before test flows.
- `src/ios-user-app/App/OfflineCacheStore.swift`
  - Added `clearAll()` helper to reset cached payloads for deterministic test scenarios.
- `src/ios-user-app/UITests/MenuFitUserAppUITests.swift`
  - Replaced basic smoke-only checks with deterministic mocked success/failure scenario tests.
  - Added launch environment setup helper and resilient text lookup helper for scrollable lists.
- `src/ios-user-app/README.md`
  - Documented WI-228 mock-network behavior, scenario usage, and runtime override keys.

## Validation

- `xcodegen generate --spec src/ios-user-app/project.yml`
- `xcodebuild -project src/ios-user-app/MenuFitUserApp.xcodeproj -scheme MenuFitUserApp -destination "platform=iOS Simulator,id=<SIM_ID>" test CODE_SIGNING_ALLOWED=NO`
