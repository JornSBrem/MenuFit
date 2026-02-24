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
