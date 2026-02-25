<!-- markdownlint-disable-file -->
# Release Changes: WI-224 Cloud deployment provisioning voor productie-omgeving

**Related Plan**: 2026-02-25-wi-224-cloud-deployment-provisioning-plan.md
**Implementation Date**: 2026-02-25

## Summary

Added reproducible Azure production infrastructure provisioning assets (compute, network, secrets, observability baseline, edge profile) with scripted deploy/validate/rollback flow and runbook documentation.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-25-wi-224-cloud-deployment-provisioning-plan.md`
- `.copilot-tracking/changes/2026-02-25-wi-224-cloud-deployment-provisioning-changes.md`
- `infrastructure/environments/prod/README.md`
- `infrastructure/environments/prod/main.bicep`
- `infrastructure/environments/prod/main.parameters.example.json`
- `infrastructure/environments/prod/deploy-prod-infra.sh`
- `infrastructure/environments/prod/validate-prod-infra.sh`
- `infrastructure/environments/prod/rollback-prod-infra.sh`
- `infrastructure/environments/prod/prod-infra-config.test.ts`
- `docs/ops/prod-infra-runbook.md`

### Modified

- `workitems/workitems.md`
- `infrastructure/environments/README.md`

### Removed

- _none_

## Validation

- `node --test --experimental-strip-types infrastructure/environments/prod/prod-infra-config.test.ts`

## Out-of-scope Conversion Check

Reviewed plan out-of-scope items when moving WI-224 to `DONE`:
- Added `WI-234` for application database engine migration rollout in cloud provisioning path.
- Added `WI-235` for blue/green traffic shifting automation and zero-downtime release orchestration.

## Release Summary

**Total Files Affected**: 12
