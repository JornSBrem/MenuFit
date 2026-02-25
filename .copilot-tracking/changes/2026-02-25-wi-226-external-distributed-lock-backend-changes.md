<!-- markdownlint-disable-file -->
# Release Changes: WI-226 Externe distributed lock backend integratie (Redis/etcd)

**Related Plan**: 2026-02-25-wi-226-external-distributed-lock-backend-plan.md
**Implementation Date**: 2026-02-25

## Summary

Added configurable external distributed lock backend support with Redis lease acquire/renew/release semantics, runtime wiring via `STATE_LOCK_*` config keys, fail-open/fail-closed behavior, and production Redis setup + failover runbook.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-25-wi-226-external-distributed-lock-backend-plan.md`
- `.copilot-tracking/changes/2026-02-25-wi-226-external-distributed-lock-backend-changes.md`
- `infrastructure/environments/prod/redis/README.md`
- `infrastructure/environments/prod/redis/redis-cache.bicep`
- `infrastructure/environments/prod/redis/redis-cache.parameters.example.json`
- `infrastructure/environments/prod/redis/deploy-prod-redis.sh`
- `infrastructure/environments/prod/redis/redis-lock-config.test.ts`
- `docs/ops/distributed-lock-failover-runbook.md`

### Modified

- `workitems/workitems.md`
- `src/backend/integrations/storage/distributed-lock.ts`
- `src/backend/integrations/storage/distributed-lock.test.ts`
- `src/backend/application/config/create-persistent-state-store.ts`
- `src/backend/application/config/create-persistent-state-store.test.ts`
- `src/backend/application/config/README.md`
- `src/backend/integrations/storage/README.md`
- `src/shared/config/default-definitions.ts`
- `infrastructure/environments/README.md`
- `infrastructure/environments/prod/README.md`

### Removed

- _none_

## Validation

- `node --test --experimental-strip-types src/backend/integrations/storage/distributed-lock.test.ts src/backend/application/config/create-persistent-state-store.test.ts src/backend/integrations/storage/persistent-state-store.test.ts infrastructure/environments/prod/redis/redis-lock-config.test.ts`

## Out-of-scope Conversion Check

Reviewed plan out-of-scope items when moving WI-226 to `DONE`:
- Added `WI-238` for full etcd lock backend implementation parity.
- `WI-227` already exists for lock contention observability dashboards (no duplicate created).

## Release Summary

**Total Files Affected**: 18
