<!-- markdownlint-disable-file -->
# Release Changes: WI-202 Dynamic kcal profiles on baseline datasets

**Related Plan**: 2026-02-24-wi-202-dynamic-kcal-profiles-plan.md
**Implementation Date**: 2026-02-24

## Summary

Implemented dynamic kcal profile derivation in gold read paths so `/api/v3/week` reads can serve non-baseline kcal requests from the closest baseline model for the same week/basePersons without requiring extra ingest.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-202-dynamic-kcal-profiles-plan.md`
- `.copilot-tracking/changes/2026-02-24-wi-202-dynamic-kcal-profiles-changes.md`

### Modified

- `workitems/workitems.md`
- `src/backend/application/gold/read-service.ts`
- `src/backend/application/gold/read-service.test.ts`
- `src/backend/application/gold/README.md`
- `src/backend/interfaces/http/week/README.md`
- `src/backend/tests/e2e-smoke.test.ts`

### Removed

- _none_

## Validation

- `node --test --experimental-strip-types src/backend/application/gold/read-service.test.ts`
- `node --test --experimental-strip-types src/backend/tests/e2e-smoke.test.ts`

## Out-of-scope Conversion Check

Reviewed plan out-of-scope items when moving WI-202 to `DONE`:
- Added `WI-216` for arbitrary ingest matrix expansion beyond baseline kcal sets.
- Added `WI-217` for user-facing kcal profile management/preferences UI.

## Release Summary

**Total Files Affected**: 8
