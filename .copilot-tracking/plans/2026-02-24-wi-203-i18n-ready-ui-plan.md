<!-- markdownlint-disable-file -->
# Plan: WI-203 i18n-ready UI (NL-only with resource-based strings)

## Scope

Introduce resource-based UI strings to prepare for multi-language support:
- add centralized NL string resources for iOS user app screens
- replace hardcoded iOS UI text usages with resource lookups
- add admin-web i18n resource module for core labels/status text to prepare future React shell

Out of scope:
- full multi-language runtime switching
- complete translation coverage for backend/domain error payloads

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/best_practices.md`

## Success Criteria

- [x] iOS user views use centralized resource strings instead of hardcoded literals.
- [x] Admin-web baseline exposes resource-based labels in a reusable i18n module.
- [x] Structure is locale-extensible without changing screen logic.

## Tasks

### Phase 1: iOS string resources

- [x] Add iOS localization resource module with key-based lookup and NL dictionary.
- [x] Refactor Week/Match/Order/RootTab screens and user-facing view-model errors to consume resource keys.

### Phase 2: Admin-web i18n baseline

- [x] Add admin-web i18n modules (`locale`, `resources`, `translate`) for NL labels.
- [x] Add helper mappings for admin tab labels and operation status labels.

### Phase 3: Validation and tracking

- [x] Add lightweight tests for admin-web i18n key resolution behavior.
- [x] Update docs/tracking artifacts (`plans`, `changes`, `workitems`).
