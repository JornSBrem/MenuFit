<!-- markdownlint-disable-file -->
# Release Changes: WI-203 i18n-ready UI (NL-only with resource-based strings)

**Related Plan**: 2026-02-24-wi-203-i18n-ready-ui-plan.md
**Implementation Date**: 2026-02-24

## Summary

Added resource-based NL string handling for iOS screens and admin-web baseline modules, replacing hardcoded user-facing iOS literals and introducing reusable admin translation/mapping helpers for future React UI wiring.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-203-i18n-ready-ui-plan.md`
- `.copilot-tracking/changes/2026-02-24-wi-203-i18n-ready-ui-changes.md`
- `src/ios-user-app/App/Localization.swift`
- `src/admin-web/src/i18n/resources/nl.ts`
- `src/admin-web/src/i18n/index.ts`
- `src/admin-web/src/i18n/index.test.ts`
- `src/admin-web/src/admin-labels.ts`
- `src/admin-web/src/admin-labels.test.ts`

### Modified

- `workitems/workitems.md`
- `src/ios-user-app/App/RootTabView.swift`
- `src/ios-user-app/App/WeekScreen.swift`
- `src/ios-user-app/App/MatchScreen.swift`
- `src/ios-user-app/App/OrderScreen.swift`
- `src/ios-user-app/App/UserFlowViewModel.swift`
- `src/ios-user-app/App/BackendAPI.swift`
- `src/ios-user-app/README.md`
- `src/admin-web/src/README.md`
- `src/ios-user-app/MenuFitUserApp.xcodeproj/project.pbxproj`

### Removed

- _none_

## Validation

- `node --test --experimental-strip-types src/admin-web/src/i18n/index.test.ts src/admin-web/src/admin-labels.test.ts`
- `node --test --experimental-strip-types src/backend/tests/e2e-smoke.test.ts`
- `xcodebuild -project src/ios-user-app/MenuFitUserApp.xcodeproj -scheme MenuFitUserApp -sdk iphonesimulator -configuration Debug build CODE_SIGNING_ALLOWED=NO`

## Out-of-scope Conversion Check

Reviewed plan out-of-scope items when moving WI-203 to `DONE`:
- Added `WI-218` for runtime locale switching and locale persistence.
- Added `WI-219` for complete localization mapping of backend/domain error payloads.

## Release Summary

**Total Files Affected**: 18
