# WI-229 Changes

## Summary

- Added reusable iOS UITest snapshot assertion tooling with pixel-diff comparison.
- Integrated visual regression assertions into the primary tab smoke flow.
- Captured and committed baseline snapshots for core UI states used in verify mode and CI.

## Files

- `src/ios-user-app/UITests/SnapshotAssert.swift`
  - Added `SnapshotAssert.assertElementSnapshot(...)` with CI-safe baseline handling.
  - Added baseline/actual/diff attachments for diagnostic output on mismatches.
- `src/ios-user-app/UITests/MenuFitUserAppUITests.swift`
  - Extended smoke test with snapshot assertions for tab bar and key navigation bars.
  - Kept test flow without backend mock data dependency.
- `src/ios-user-app/UITests/Snapshots/tabbar-week.png`
- `src/ios-user-app/UITests/Snapshots/week-screen.png`
- `src/ios-user-app/UITests/Snapshots/match-screen.png`
- `src/ios-user-app/UITests/Snapshots/order-screen.png`
- `src/ios-user-app/README.md`
  - Documented record/verify usage for snapshot baselines.
- `.copilot-tracking/plans/2026-02-25-wi-229-ios-visual-regression-snapshots-plan.md`
  - Marked all success criteria/tasks as complete.
- `workitems/workitems.md`
  - Moved WI-229 to `DONE`.
  - Converted WI-229 out-of-scope points into WI-252 and WI-253.

## Validation

- `MENUFIT_SNAPSHOT_RECORD=1 xcodebuild -project src/ios-user-app/MenuFitUserApp.xcodeproj -scheme MenuFitUserApp -destination "platform=iOS Simulator,id=E210661C-2E86-408B-97B9-38E5BAAC7753" test CODE_SIGNING_ALLOWED=NO`
- `xcodebuild -project src/ios-user-app/MenuFitUserApp.xcodeproj -scheme MenuFitUserApp -destination "platform=iOS Simulator,id=E210661C-2E86-408B-97B9-38E5BAAC7753" test CODE_SIGNING_ALLOWED=NO`

## Out-of-scope Conversion Check

- Added `WI-252` for multi-device snapshot baseline matrices.
- Added `WI-253` for evaluation of external visual regression services.
