<!-- markdownlint-disable-file -->
# Plan: WI-215 iOS UI testautomatisering via Xcode simulator in CI

## Scope

Add baseline iOS UI smoke automation for the primary user flow:
- add iOS UI test target and baseline smoke test for Week -> Match -> Bestellen navigation
- update XcodeGen project definition to include UI test target in test scheme
- wire a CI macOS job that runs simulator UI tests
- document iOS UI smoke execution flow

Out of scope:
- extensive end-to-end mobile test suite with backend mocks/network virtualization
- visual regression snapshot tooling

## Docs Used

- `src/ios-user-app/README.md`
- `docs/TEST_STRATEGY_AND_RELEASE_GATES.md`
- `.github/workflows/ci.yml`

## Success Criteria

- [x] Baseline iOS UI smoke test executes in simulator.
- [x] CI pipeline runs iOS UI smoke tests on macOS runner.
- [x] Primary tab flow regressions are detected by automated UI assertions.

## Tasks

### Phase 1: UI test target scaffolding

- [x] Add UI test target/files for primary tab flow smoke checks.
- [x] Update XcodeGen scheme/target config to include UI tests.

### Phase 2: CI wiring

- [x] Add CI workflow job for iOS simulator UI tests.
- [x] Update testing docs to include iOS UI smoke path.

### Phase 3: Validation and tracking

- [x] Run local simulator test command for smoke suite.
- [x] Update tracking artifacts (`plans`, `changes`, `workitems`) after implementation.
