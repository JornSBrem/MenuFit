# iOS User App Boundary

`src/ios-user-app` is for the primary user flow:

- Week -> Match -> Bestellen
- user-specific Picnic session usage
- offline cache for week and grocery data

Admin and extract operations are out of scope for this app.

## WI-010 Baseline

Current baseline SwiftUI structure in `App/`:

- `MenuFitUserApp.swift`: app entry point with shared `UserFlowViewModel`.
- `RootTabView.swift`: 3 primary tabs (`Week`, `Match`, `Bestellen`).
- `WeekScreen.swift`: week selection, online load, and offline cache indicator.
- `MatchScreen.swift`: match status and reconcile detail view.
- `OrderScreen.swift`: cart plan and online-only sync action/report.
- `BackendAPI.swift`: backend calls for `/api/v3/week/*` and `/api/v3/cart/sync`.
- `OfflineCacheStore.swift`: local cache for week summary + groceries.
- `UserFlowViewModel.swift`: orchestrates online fetch, cache fallback, and sync flow.
- `UserFlowModels.swift`: API and cache models.
- `Localization.swift`: NL resource-based string catalog for i18n-ready UI rendering.

Notes:
- Week/groceries support offline fallback via cache.
- Cart sync remains online-only (`mode=execute`, source `user`).

## WI-210 Productionization Baseline

Added production-oriented wiring:

- `App/AppEnvironment.swift`: reads backend URL and default user session fields from `Info.plist`.
- `App/AuthSessionStore.swift`: persisted user token session store used as bearer-token provider.
- `App/BackendAPI.swift`: attaches `Authorization: Bearer <token>` to API requests and includes match endpoints:
  - `/api/v3/match/evaluate`
  - `/api/v3/match/queue`
  - `/api/v3/match/review-action`
- `App/UserFlowViewModel.swift`: match evaluate/queue/review actions and auth-session aware cart sync household handling.
- `App/MatchScreen.swift`: interactive match controls (`evaluate`, `map`, `skip`, `defer`) and queue/result rendering.

Signing/team development:

- `project.yml` now uses `CODE_SIGN_STYLE = Automatic` and `DEVELOPMENT_TEAM = YOURTEAMID`.
- Replace `YOURTEAMID` with your team id in local/dev branches if needed.
- CI/simulator builds can still override signing with `CODE_SIGNING_ALLOWED=NO`.

Runtime configuration keys in `Info.plist`:

- `MenuFitBackendBaseURL`
- `MenuFitUserAccessToken`
- `MenuFitUserSubjectId`
- `MenuFitPicnicAccountId`
- `MenuFitHouseholdId`
- `MenuFitUserTokenExpiryEpochSeconds`

## WI-215 UI Smoke Automation

- UI smoke test file: `UITests/MenuFitUserAppUITests.swift`
- Scope: tab-based primary flow checks (`Week -> Match -> Bestellen`)

Local run (after `xcodegen generate --spec src/ios-user-app/project.yml`):

```bash
SIM_ID=$(
  xcrun simctl list devices available -j | jq -r '
    .devices
    | to_entries
    | map(select(.key | startswith("com.apple.CoreSimulator.SimRuntime.iOS-")))
    | sort_by(.key)
    | reverse
    | map(.value[] | select(.isAvailable == true and (.name | startswith("iPhone"))))
    | .[0].udid // empty
  '
)
if [ -z "$SIM_ID" ]; then
  echo "No available iPhone simulator found."
  exit 1
fi
xcrun simctl boot "$SIM_ID" || true
xcrun simctl bootstatus "$SIM_ID" -b
xcodebuild \
  -project src/ios-user-app/MenuFitUserApp.xcodeproj \
  -scheme MenuFitUserApp \
  -destination "platform=iOS Simulator,id=$SIM_ID" \
  test CODE_SIGNING_ALLOWED=NO
```

## WI-228 Deterministische E2E met Netwerkvirtualisatie

- `App/UITestNetworkMock.swift` voegt URLProtocol-gebaseerde mockresponses toe voor:
  - `/api/v3/week/summary`
  - `/api/v3/week/groceries`
  - `/api/v3/match/queue`
  - `/api/v3/match/evaluate`
  - `/api/v3/match/review-action`
  - `/api/v3/cart/sync`
- Activatie via launch environment `MENUFIT_UI_TEST_SCENARIO`:
  - `success`: complete primaire flow met deterministic data
  - `week_failure`: simuleert fout op week summary endpoint
- `AppEnvironment` accepteert runtime overrides via process environment voor:
  - `MenuFitBackendBaseURL`
  - `MenuFitUserAccessToken`
  - `MenuFitUserSubjectId`
  - `MenuFitPicnicAccountId`
  - `MenuFitHouseholdId`
  - `MenuFitUserTokenExpiryEpochSeconds`
- UI-tests zetten `MenuFitBackendBaseURL=https://mock.local`; requests naar `mock.local` worden onderschept door de mock URLProtocol zodat de suite geen externe backend nodig heeft.
- In UITest-mode gebruikt de app een geïsoleerde `UserDefaults` suite (`menufit.ui-tests`) om sessiestate deterministisch te houden tussen runs.
