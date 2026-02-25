<!-- markdownlint-disable-file -->
# Release Changes: WI-215 iOS UI testautomatisering via Xcode simulator in CI

**Related Plan**: 2026-02-24-wi-215-ios-ui-smoke-ci-plan.md
**Implementation Date**: 2026-02-25

## Summary

Added a baseline iOS UI smoke test target and automated simulator execution in CI for the primary user flow (`Week -> Match -> Bestellen`), including robust simulator-id selection and updated testing documentation.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-215-ios-ui-smoke-ci-plan.md`
- `.copilot-tracking/changes/2026-02-24-wi-215-ios-ui-smoke-ci-changes.md`
- `src/ios-user-app/UITests/MenuFitUserAppUITests.swift`
- `src/ios-user-app/MenuFitUserApp.xcodeproj/xcshareddata/xcschemes/MenuFitUserApp.xcscheme`

### Modified

- `workitems/workitems.md`
- `.github/workflows/ci.yml`
- `docs/TEST_STRATEGY_AND_RELEASE_GATES.md`
- `src/ios-user-app/README.md`
- `src/ios-user-app/project.yml`
- `src/ios-user-app/MenuFitUserApp.xcodeproj/project.pbxproj`

### Removed

- _none_

## Validation

- `xcodebuild -project src/ios-user-app/MenuFitUserApp.xcodeproj -scheme MenuFitUserApp -destination 'platform=iOS Simulator,id=E210661C-2E86-408B-97B9-38E5BAAC7753' test CODE_SIGNING_ALLOWED=NO`

## Out-of-scope Conversion Check

Reviewed plan out-of-scope items when moving WI-215 to `DONE`:
- Added `WI-228` for extended iOS E2E suite with backend mocks/network virtualization.
- Added `WI-229` for iOS visual regression snapshot tooling.

## Release Summary

**Total Files Affected**: 11
