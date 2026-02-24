<!-- markdownlint-disable-file -->
# Release Changes: WI-210 iOS productionization met Xcode project, token-auth en uitgebreide match-flow

**Related Plan**: 2026-02-24-wi-210-ios-productionization-token-auth-match-plan.md
**Implementation Date**: 2026-02-24

## Summary

Productionized the iOS app baseline by adding bearer-token session wiring, interactive match workflow integration (`evaluate`, `queue`, `review`), and team-ready Xcode signing configuration with documented runtime environment keys.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-210-ios-productionization-token-auth-match-plan.md`
- `.copilot-tracking/changes/2026-02-24-wi-210-ios-productionization-token-auth-match-changes.md`
- `src/ios-user-app/App/AppEnvironment.swift`
- `src/ios-user-app/App/AuthSessionStore.swift`

### Modified

- `workitems/workitems.md`
- `src/ios-user-app/App/BackendAPI.swift`
- `src/ios-user-app/App/Info.plist`
- `src/ios-user-app/App/Localization.swift`
- `src/ios-user-app/App/MatchScreen.swift`
- `src/ios-user-app/App/MenuFitUserApp.swift`
- `src/ios-user-app/App/UserFlowModels.swift`
- `src/ios-user-app/App/UserFlowViewModel.swift`
- `src/ios-user-app/App/WeekScreen.swift`
- `src/ios-user-app/MenuFitUserApp.xcodeproj/project.pbxproj`
- `src/ios-user-app/README.md`
- `src/ios-user-app/project.yml`

### Removed

- _none_

## Validation

- `xcodegen generate --spec src/ios-user-app/project.yml`
- `xcodebuild -project src/ios-user-app/MenuFitUserApp.xcodeproj -scheme MenuFitUserApp -sdk iphonesimulator -configuration Debug build CODE_SIGNING_ALLOWED=NO`

## Out-of-scope Conversion Check

Reviewed plan out-of-scope items when moving WI-210 to `DONE`:
- No new workitems added because both out-of-scope topics already exist as open items (`WI-220` and `WI-221`).

## Release Summary

**Total Files Affected**: 17
