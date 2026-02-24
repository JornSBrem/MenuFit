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

Notes:
- Week/groceries support offline fallback via cache.
- Cart sync remains online-only (`mode=execute`, source `user`).
- Base URL is currently hardcoded in `MenuFitUserApp.swift` and should be externalized in a production setup.
