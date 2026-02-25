<!-- markdownlint-disable-file -->
# Release Changes: WI-225 Postgres runtime en operationele DB setup voor persistente domeinen

**Related Plan**: 2026-02-25-wi-225-postgres-runtime-operational-setup-plan.md
**Implementation Date**: 2026-02-25

## Summary

Extended persistent runtime storage with a postgres driver path, secure config keys, and test coverage; added postgres provisioning artifacts and operational runbooks covering pooling, backup, and restore for production use.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-25-wi-225-postgres-runtime-operational-setup-plan.md`
- `.copilot-tracking/changes/2026-02-25-wi-225-postgres-runtime-operational-setup-changes.md`
- `src/backend/domain/storage/sql/state-postgres-schema.sql`
- `infrastructure/environments/prod/postgres/README.md`
- `infrastructure/environments/prod/postgres/postgres-flex-server.bicep`
- `infrastructure/environments/prod/postgres/postgres-flex-server.parameters.example.json`
- `infrastructure/environments/prod/postgres/deploy-prod-postgres.sh`
- `infrastructure/environments/prod/postgres/postgres-runtime-config.test.ts`
- `docs/ops/postgres-runtime-runbook.md`

### Modified

- `workitems/workitems.md`
- `src/backend/integrations/storage/persistent-state-store.ts`
- `src/backend/integrations/storage/persistent-state-store.test.ts`
- `src/backend/integrations/storage/README.md`
- `src/backend/application/config/create-persistent-state-store.ts`
- `src/backend/application/config/create-persistent-state-store.test.ts`
- `src/backend/application/config/README.md`
- `src/shared/config/default-definitions.ts`
- `infrastructure/environments/README.md`
- `infrastructure/environments/prod/README.md`

### Removed

- _none_

## Validation

- `node --test --experimental-strip-types src/backend/integrations/storage/persistent-state-store.test.ts src/backend/application/config/create-persistent-state-store.test.ts infrastructure/environments/prod/postgres/postgres-runtime-config.test.ts`

## Out-of-scope Conversion Check

Reviewed plan out-of-scope items when moving WI-225 to `DONE`:
- Added `WI-236` for automated sqlite-to-postgres migration tooling for live cutover.
- Added `WI-237` for sharded/multi-region postgres topology design and rollout.

## Release Summary

**Total Files Affected**: 19
