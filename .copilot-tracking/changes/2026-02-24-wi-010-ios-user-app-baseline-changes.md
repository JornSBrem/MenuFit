<!-- markdownlint-disable-file -->
# Release Changes: WI-010 iOS user app baseline with offline cache

**Related Plan**: 2026-02-24-wi-010-ios-user-app-baseline-plan.md
**Implementation Date**: 2026-02-24

## Summary

Implemented a SwiftUI user-app baseline with Week/Match/Bestellen screens, backend API integration, offline cache for week/groceries, and online-only cart sync behavior.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-010-ios-user-app-baseline-plan.md` - Added WI-010 implementation plan.
- `.copilot-tracking/changes/2026-02-24-wi-010-ios-user-app-baseline-changes.md` - Added WI-010 release tracking file.
- `src/ios-user-app/App/MenuFitUserApp.swift` - Added SwiftUI app entry with shared user-flow state.
- `src/ios-user-app/App/UserFlowModels.swift` - Added API/cached model contracts for week, groceries, match status, and cart sync report.
- `src/ios-user-app/App/BackendAPI.swift` - Added backend client for `/api/v3/week/*` and `/api/v3/cart/sync`.
- `src/ios-user-app/App/OfflineCacheStore.swift` - Added local file-based offline cache for week+groceries bundle.
- `src/ios-user-app/App/UserFlowViewModel.swift` - Added online fetch orchestration, offline fallback, and online-only sync action.
- `src/ios-user-app/App/RootTabView.swift` - Added 3-tab app shell.
- `src/ios-user-app/App/WeekScreen.swift` - Added week selection and groceries screen.
- `src/ios-user-app/App/MatchScreen.swift` - Added matching status/reconcile screen.
- `src/ios-user-app/App/OrderScreen.swift` - Added cart plan and sync report screen.

### Modified

- `src/ios-user-app/README.md` - Documented WI-010 baseline architecture and offline/online behavior.
- `.copilot-tracking/plans/2026-02-24-wi-010-ios-user-app-baseline-plan.md` - Marked all WI-010 tasks complete.

### Removed

- _none_

## Release Summary

**Total Files Affected**: 13
