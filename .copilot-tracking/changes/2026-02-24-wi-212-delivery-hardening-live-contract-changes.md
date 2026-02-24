<!-- markdownlint-disable-file -->
# Release Changes: WI-212 Delivery hardening: deploy wiring, branch protection en live contract-validatie

**Related Plan**: 2026-02-24-wi-212-delivery-hardening-live-contract-plan.md
**Implementation Date**: 2026-02-24

## Summary

Hardened delivery with branch-protection policy-as-code and apply script, plus a live API contract checker wired into CI release checks, including documentation for required secrets and status checks.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-212-delivery-hardening-live-contract-plan.md`
- `.copilot-tracking/changes/2026-02-24-wi-212-delivery-hardening-live-contract-changes.md`
- `infrastructure/environments/branch-protection.main.json`
- `infrastructure/environments/apply-branch-protection.sh`
- `infrastructure/release-gates/check-live-contracts.ts`

### Modified

- `workitems/workitems.md`
- `.github/workflows/ci.yml`
- `docs/TEST_STRATEGY_AND_RELEASE_GATES.md`
- `infrastructure/environments/README.md`
- `infrastructure/release-gates/README.md`

### Removed

- _none_

## Validation

- `node --experimental-strip-types infrastructure/release-gates/check-live-contracts.ts`
- `./infrastructure/environments/apply-branch-protection.sh --help`
- `node --experimental-strip-types infrastructure/release-gates/check-kpi-gates.ts infrastructure/release-gates/sample-metrics.json`

## Out-of-scope Conversion Check

Reviewed plan out-of-scope items when moving WI-212 to `DONE`:
- Added `WI-224` for full cloud deployment provisioning of production environment resources.
- Runtime application of branch protection remains an operational execution step using the committed apply script.

## Release Summary

**Total Files Affected**: 10
