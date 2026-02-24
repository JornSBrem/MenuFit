<!-- markdownlint-disable-file -->
# Release Changes: WI-208 Production scheduler + background retry queues

**Related Plan**: 2026-02-24-wi-208-production-scheduler-retry-plan.md
**Implementation Date**: 2026-02-24

## Summary

Added a production scheduler baseline and persistent retry queue infrastructure for ingest/system background jobs, including persisted scheduler run history, retry backoff/dead-letter behavior, and coordinator wiring that records failures and queues retries.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-208-production-scheduler-retry-plan.md`
- `.copilot-tracking/changes/2026-02-24-wi-208-production-scheduler-retry-changes.md`
- `src/backend/jobs/types.ts`
- `src/backend/jobs/production-scheduler.ts`
- `src/backend/jobs/production-scheduler.test.ts`
- `src/backend/jobs/persistent-retry-queue.ts`
- `src/backend/jobs/persistent-retry-queue.test.ts`
- `src/backend/jobs/job-coordinator.ts`
- `src/backend/jobs/job-coordinator.test.ts`
- `src/backend/jobs/system-operations-jobs.test.ts`

### Modified

- `workitems/workitems.md`
- `src/backend/jobs/system-operations-jobs.ts`
- `src/backend/jobs/README.md`
- `src/backend/application/ingest/README.md`
- `src/backend/integrations/storage/persistent-state-store.ts`
- `src/backend/integrations/storage/persistent-state-store.test.ts`

### Removed

- _none_

## Validation

- `node --test --experimental-strip-types src/backend/jobs/persistent-retry-queue.test.ts src/backend/jobs/production-scheduler.test.ts src/backend/jobs/job-coordinator.test.ts src/backend/jobs/system-operations-jobs.test.ts src/backend/integrations/storage/persistent-state-store.test.ts src/backend/tests/e2e-smoke.test.ts`

## Out-of-scope Conversion Check

Reviewed plan out-of-scope items when moving WI-208 to `DONE`:
- No new workitems added because both out-of-scope topics already exist as open items (`WI-211` and `WI-214`).

## Release Summary

**Total Files Affected**: 16
