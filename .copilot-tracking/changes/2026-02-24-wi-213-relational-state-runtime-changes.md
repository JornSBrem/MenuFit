<!-- markdownlint-disable-file -->
# Release Changes: WI-213 Relationele database runtime-integratie voor persistente domeinen

**Related Plan**: 2026-02-24-wi-213-relational-state-runtime-plan.md
**Implementation Date**: 2026-02-24

## Summary

Added relational runtime support for persistent application state by extending `PersistentStateStore` with a SQLite driver, while preserving existing file-driver compatibility and migration behavior across silver/gold/jobs/idempotency/audit and related persisted domains.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-213-relational-state-runtime-plan.md`
- `.copilot-tracking/changes/2026-02-24-wi-213-relational-state-runtime-changes.md`

### Modified

- `workitems/workitems.md`
- `src/backend/integrations/storage/persistent-state-store.ts`
- `src/backend/integrations/storage/persistent-state-store.test.ts`
- `src/backend/application/config/create-persistent-state-store.ts`
- `src/backend/application/config/create-persistent-state-store.test.ts`
- `src/shared/config/default-definitions.ts`
- `src/backend/integrations/storage/README.md`

### Removed

- _none_

## Validation

- `node --test --experimental-strip-types src/backend/integrations/storage/persistent-state-store.test.ts src/backend/application/config/create-persistent-state-store.test.ts src/backend/tests/e2e-smoke.test.ts`

## Out-of-scope Conversion Check

Reviewed plan out-of-scope items when moving WI-213 to `DONE`:
- Added `WI-225` for full Postgres runtime/deployment and operational DB setup.
- No new item added for distributed locking because that is already tracked by `WI-214`.

## Release Summary

**Total Files Affected**: 9
