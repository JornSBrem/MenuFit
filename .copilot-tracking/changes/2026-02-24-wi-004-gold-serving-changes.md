<!-- markdownlint-disable-file -->
# Release Changes: WI-004 Gold serving layer and week read routes

**Related Plan**: 2026-02-24-wi-004-gold-serving-plan.md
**Implementation Date**: 2026-02-24

## Summary

Baseline gold serving projection and week read route handlers for app-ready `/api/v3/week/*` responses.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-004-gold-serving-plan.md` - Added WI-004 plan with phased implementation checklist.
- `.copilot-tracking/changes/2026-02-24-wi-004-gold-serving-changes.md` - Added WI-004 change tracking file.
- `src/backend/domain/storage/sql/gold-schema.sql` - Added gold schema draft for week plan, groceries, reconcile, match results, and cart plan.
- `src/backend/application/gold/types.ts` - Added gold view models and week route response contracts.
- `src/backend/application/gold/projection.ts` - Added deterministic silver-to-gold projection logic.
- `src/backend/application/gold/read-service.ts` - Added in-memory week read service for summary and groceries.
- `src/backend/application/gold/index.ts` - Added gold module exports.
- `src/backend/application/gold/README.md` - Added gold serving module guidance.
- `src/backend/interfaces/http/week/week-routes.ts` - Added `/api/v3/week/summary` and `/api/v3/week/groceries` handler module with stable API envelopes.
- `src/backend/interfaces/http/week/README.md` - Added week routes module notes.

### Modified

- `src/backend/interfaces/http/README.md` - Documented implemented week read handler baseline.
- `.copilot-tracking/plans/2026-02-24-wi-004-gold-serving-plan.md` - Marked all WI-004 tasks and success criteria complete.

### Removed

- _none_

## Release Summary

**Total Files Affected**: 12
