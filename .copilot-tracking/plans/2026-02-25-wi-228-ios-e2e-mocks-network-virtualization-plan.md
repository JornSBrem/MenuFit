<!-- markdownlint-disable-file -->
# Plan: WI-228 Uitgebreide iOS E2E testsuite met backend mocks en netwerkvirtualisatie

## Scope

Add deterministic iOS end-to-end tests with mock backend/network virtualization:
- introduce URL loading virtualization for app runtime in UITest mode
- add deterministic fixture responses for core flow success and error scenarios
- expand UI/E2E tests beyond tab smoke checks to include data rendering and failure handling
- document local/CI execution behavior for mocked network suite

Out of scope:
- snapshot-based visual regression assertions (tracked separately)
- contract replay tooling from captured HAR sessions

## Docs Used

- `src/ios-user-app/README.md`
- `src/ios-user-app/UITests/MenuFitUserAppUITests.swift`
- `src/ios-user-app/App/BackendAPI.swift`

## Success Criteria

- [x] iOS testsuite dekt kernscenario's en foutpaden met deterministische backend mocks.
- [x] Netwerkvirtualisatie voorkomt flaky tests door externe afhankelijkheden.

## Tasks

### Phase 1: Network virtualization

- [x] Add UITest-aware network interception/mocking in app runtime.
- [x] Add fixture-driven responses for week/match/cart endpoints.

### Phase 2: E2E suite expansion

- [x] Add success-path E2E assertions validating rendered data from mocked backend.
- [x] Add failure-path assertions validating user-visible error handling.

### Phase 3: Validation and tracking

- [x] Run iOS test command for mocked E2E suite.
- [x] Update tracking artifacts (`plans`, `changes`, `workitems`) after implementation.
