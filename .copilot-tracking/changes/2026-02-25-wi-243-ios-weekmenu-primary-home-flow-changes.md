# WI-243 Changes

## Summary

- Shifted iOS home emphasis to weekmenu consumption with day-focused rendering.
- Added linked household member switcher and week-to-week navigation in `WeekScreen`.
- Extended gold week summary to include meal entries so iOS can render day menus directly.

## Files

- `src/ios-user-app/App/WeekScreen.swift`
  - Added household member selector, week previous/next controls, day tabs, and day-menu list.
- `src/ios-user-app/App/UserFlowViewModel.swift`
  - Added household-status loading, selected member/day state, day-menu derivation, and week navigation actions.
  - Added default day-focus logic that prefers today's day label.
- `src/ios-user-app/App/BackendAPI.swift`
  - Added `/api/v3/households/me` read method for linked member context.
- `src/ios-user-app/App/UserFlowModels.swift`
  - Added meal and household DTOs, extended `WeekSummaryResponse` with optional meals.
- `src/ios-user-app/App/Localization.swift`
  - Added labels/messages for household switcher and week/day menu controls.
- `src/backend/application/gold/types.ts`
  - Added `GoldMealView` and included `meals` in read model + week summary response.
- `src/backend/application/gold/projection.ts`
  - Projected silver meals into gold meals.
- `src/backend/application/gold/read-service.ts`
  - Included meals in summary payloads.
- `src/backend/application/gold/index.ts`
  - Exported `GoldMealView`.
- `src/backend/application/gold/read-service.test.ts`
- `src/backend/tests/e2e-smoke.test.ts`
  - Updated fixtures for new `meals` field.
- `src/ios-user-app/UITests/MenuFitUserAppUITests.swift`
  - Stabilized week-screen smoke assertion for revised layout.

## Validation

- `xcodebuild -project src/ios-user-app/MenuFitUserApp.xcodeproj -scheme MenuFitUserApp -destination "platform=iOS Simulator,id=E210661C-2E86-408B-97B9-38E5BAAC7753" test CODE_SIGNING_ALLOWED=NO`

## Out-of-scope Conversion Check

- Added `WI-255` for backend member-specific weekmenu filtering for selected household member.
