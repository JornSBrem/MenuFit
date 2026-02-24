<!-- markdownlint-disable-file -->
# Release Changes: WI-206 Persistent storage and migrations baseline

**Related Plan**: 2026-02-24-wi-206-persistence-migrations-plan.md
**Implementation Date**: 2026-02-24

## Summary

Implemented a versioned persistent state store with migration support and wired it through silver, gold, cart, matching, system, and audit services so state rehydrates on startup and persists after mutations.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-206-persistence-migrations-plan.md`
- `.copilot-tracking/changes/2026-02-24-wi-206-persistence-migrations-changes.md`
- `src/backend/integrations/storage/persistent-state-store.ts`
- `src/backend/integrations/storage/persistent-state-store.test.ts`
- `src/backend/application/config/create-persistent-state-store.ts`
- `src/backend/application/config/create-persistent-state-store.test.ts`
- `src/backend/application/gold/read-service.test.ts`
- `src/backend/application/silver/reprocess.test.ts`

### Modified

- `AGENTS.md`
- `src/shared/config/default-definitions.ts`
- `src/backend/integrations/storage/README.md`
- `src/backend/application/config/README.md`
- `src/backend/application/silver/README.md`
- `src/backend/application/silver/reprocess.ts`
- `src/backend/application/silver/transformer.ts`
- `src/backend/application/gold/README.md`
- `src/backend/application/gold/read-service.ts`
- `src/backend/application/cart/README.md`
- `src/backend/application/cart/sync-service.ts`
- `src/backend/application/cart/sync-service.test.ts`
- `src/backend/application/system/README.md`
- `src/backend/application/system/system-operations-service.ts`
- `src/backend/application/system/system-operations-service.test.ts`
- `src/backend/application/matching/README.md`
- `src/backend/application/matching/review-service.ts`
- `src/backend/application/matching/review-service.test.ts`
- `src/backend/application/audit/README.md`
- `src/backend/application/audit/audit-trail-service.ts`
- `src/backend/application/audit/audit-trail-service.test.ts`

### Removed

- _none_

## Release Summary

**Total Files Affected**: 29
