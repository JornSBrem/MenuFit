<!-- markdownlint-disable-file -->
# Plan: WI-010 iOS user app baseline with offline cache

## Scope

Create a SwiftUI baseline in `src/ios-user-app` for the primary user flow:
- three core tabs/screens: Week, Match, Bestellen
- backend client for week summary, groceries, and cart sync calls
- offline cache for week summary + groceries
- sync kept online-only (no offline cart push)

Out of scope:
- Xcode project generation and App Store signing
- auth/session lifecycle with real tokens
- full match API integration beyond current backend baseline

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/best_practices.md`
- `src/ios-user-app/README.md`

## Success Criteria

- [x] Three primary screens are implemented and wired to backend data flow.
- [x] Week and groceries support offline cache read when network fails.
- [x] Cart sync remains online-only and clearly reports online failure.

## Tasks

### Phase 1: App baseline and models

- [x] Add SwiftUI app entry and shared state/view-model.
- [x] Add API models for week summary, groceries, and cart sync report.

### Phase 2: Backend and cache integration

- [x] Add backend API client with async calls to `/api/v3/week/*` and `/api/v3/cart/sync`.
- [x] Add offline cache store for week/groceries bundle with fallback read path.

### Phase 3: UI screens and tracking

- [x] Add Week/Match/Bestellen SwiftUI views using shared state.
- [x] Update iOS README and WI-010 tracking/workitem state.
