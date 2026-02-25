<!-- markdownlint-disable-file -->
# Release Changes: WI-214 Distributed locking en multi-process write coördinatie

**Related Plan**: 2026-02-24-wi-214-distributed-locking-plan.md
**Implementation Date**: 2026-02-24

## Summary

Added lease-based distributed write locking for persistent state operations and updated state update flow to reload fresh storage snapshots under lock, preventing stale-cache overwrite races across multiple process/store instances.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-214-distributed-locking-plan.md`
- `.copilot-tracking/changes/2026-02-24-wi-214-distributed-locking-changes.md`
- `src/backend/integrations/storage/distributed-lock.ts`
- `src/backend/integrations/storage/distributed-lock.test.ts`

### Modified

- `workitems/workitems.md`
- `src/backend/integrations/storage/persistent-state-store.ts`
- `src/backend/integrations/storage/persistent-state-store.test.ts`
- `src/backend/integrations/storage/README.md`

### Removed

- _none_

## Validation

- `node --test --experimental-strip-types src/backend/integrations/storage/distributed-lock.test.ts src/backend/integrations/storage/persistent-state-store.test.ts src/backend/application/config/create-persistent-state-store.test.ts src/backend/tests/e2e-smoke.test.ts`

## Out-of-scope Conversion Check

Reviewed plan out-of-scope items when moving WI-214 to `DONE`:
- Added `WI-226` for external distributed lock backend integration.
- Added `WI-227` for cluster-wide lock observability dashboards.

## Release Summary

**Total Files Affected**: 8
