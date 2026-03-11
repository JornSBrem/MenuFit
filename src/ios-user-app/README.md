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
- `SupabaseProjectURL` (preferred)
- `SupabaseAnonKey` (preferred)
- `MenuFitUserAccessToken`
- `MenuFitUserSubjectId`
- `MenuFitPicnicAccountId`
- `MenuFitHouseholdId`
- `MenuFitUserTokenExpiryEpochSeconds`

Supported Supabase aliases (fallback lookup):

- URL: `SupabaseURL`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`
- anon key: `SupabaseAnonkey`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Secret handling (no secrets in git):

- `App/Info.plist` uses build variables (`$(SUPABASE_PROJECT_URL)`, `$(SUPABASE_ANON_KEY)`, `$(MENUFIT_BACKEND_BASE_URL)`).
- Copy `Config/LocalSecrets.xcconfig.example` to `Config/LocalSecrets.xcconfig`.
- Fill local values in `LocalSecrets.xcconfig` (this file is ignored by git).
- Shared defaults live in `Config/AppConfig.xcconfig`.

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

## WI-229 Visual Regression Snapshots

- Snapshot helper: `UITests/SnapshotAssert.swift`
- Baseline files: `UITests/Snapshots/*.png`
- UI smoke test (`UITests/MenuFitUserAppUITests.swift`) vergelijkt snapshots van:
  - tab bar in week context
  - week navigation bar
  - match navigation bar
  - bestellen navigation bar

Lokale baseline opname:

```bash
MENUFIT_SNAPSHOT_RECORD=1 xcodebuild \
  -project src/ios-user-app/MenuFitUserApp.xcodeproj \
  -scheme MenuFitUserApp \
  -destination "platform=iOS Simulator,id=$SIM_ID" \
  test CODE_SIGNING_ALLOWED=NO
```

Zonder `MENUFIT_SNAPSHOT_RECORD` draait de test in verify mode en faalt CI bij visuele afwijkingen.

## WI-242 Onboarding en sessie-herstel

- App root gebruikt een auth-gate:
  - geen sessie -> onboarding/sessie startscherm
  - verlopen sessie -> sessie-herstel scherm met expliciete vernieuwactie
  - geldige sessie -> normale tabflow (Week/Match/Bestellen)
- Onboarding schrijft een `UserAuthSession` naar `AuthSessionStore`; daarna start de app automatisch de eerste data-load.
- UI smoke test ondersteunt beide paden en voert onboarding alleen uit wanneer dit scherm zichtbaar is.

## WI-243 Weekmenu-first home-flow

- `WeekScreen` focust op weekmenu consumptie:
  - gekoppelde gezinsleden bovenin selecteerbaar op `userId`
  - vorige/volgende week navigatieknoppen
  - dagtabs met standaard focus op de dag van vandaag
  - dagmenu-items op basis van `summary.meals`
- Household context wordt opgehaald via `GET /api/v3/households/me`.
