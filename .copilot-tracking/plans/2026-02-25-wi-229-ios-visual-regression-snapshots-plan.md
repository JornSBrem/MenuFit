<!-- markdownlint-disable-file -->
# Plan: WI-229 Visual regression snapshot tooling voor iOS UI

## Scope

Implement visual regression checks for core iOS screens without mock backend data:
- add reusable UI snapshot comparison helper for UITests
- capture baseline snapshots for core navigation states (Week/Match/Bestellen)
- fail tests on visual drift with explicit baseline/actual/diff attachments
- document how snapshot verification works in local + CI runs

Out of scope:
- multi-device baseline matrices and per-device snapshot sets
- external visual regression services

## Docs Used

- `src/ios-user-app/UITests/MenuFitUserAppUITests.swift`
- `src/ios-user-app/README.md`
- `.github/workflows/ci.yml`

## Success Criteria

- [x] Snapshot-baseline voor kernschermen kan geautomatiseerd vergeleken worden in CI.
- [x] Regressies op layout/styling leveren expliciete diffs en failen de quality gate.

## Tasks

### Phase 1: Snapshot helper and baselines

- [x] Add `SnapshotAssert` helper for element/image comparison in UITests.
- [x] Capture and commit baseline snapshots for tab/nav states of core screens.

### Phase 2: Suite integration

- [x] Extend UI smoke test with snapshot assertions for core screens.
- [x] Ensure mismatch diagnostics include baseline/actual/diff attachments.

### Phase 3: Validation and tracking

- [x] Run iOS UI tests locally with snapshot checks.
- [x] Update tracking artifacts (`plans`, `changes`, `workitems`) and move WI-229 to done.
