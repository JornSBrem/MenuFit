# WI-244 Changes

## Summary

- Added interactive grocery checklist behavior in iOS week flow.
- Persisted checklist completion locally per selected member and week plan.
- Introduced grouped grocery rendering with explicit open/completed sections and progress indicator.

## Files

- `src/ios-user-app/App/UserFlowViewModel.swift`
  - Added `checkedGroceryItemIds` state and local persistence via `UserDefaults`.
  - Added checklist toggle, progress, grouping helpers, and load/persist wiring per week/member key.
- `src/ios-user-app/App/WeekScreen.swift`
  - Replaced flat groceries list with grouped checklist UI.
  - Added explicit open/klaar separation and check/uncheck row interactions.
- `src/ios-user-app/App/Localization.swift`
  - Added strings for progress and checklist section labels.

## Validation

- `xcodebuild -project src/ios-user-app/MenuFitUserApp.xcodeproj -scheme MenuFitUserApp -destination "platform=iOS Simulator,id=E210661C-2E86-408B-97B9-38E5BAAC7753" test CODE_SIGNING_ALLOWED=NO`

## Out-of-scope Conversion Check

- Added `WI-256` for backend-driven aisle/category taxonomy.
- Added `WI-257` for cross-device checklist sync.
