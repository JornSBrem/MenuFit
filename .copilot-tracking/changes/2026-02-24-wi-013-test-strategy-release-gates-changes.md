<!-- markdownlint-disable-file -->
# Release Changes: WI-013 Test strategy and release gates baseline

**Related Plan**: 2026-02-24-wi-013-test-strategy-release-gates-plan.md
**Implementation Date**: 2026-02-24

## Summary

Implemented baseline CI quality gates with unit/integration/e2e smoke execution and KPI threshold enforcement for matching quality release gates.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-013-test-strategy-release-gates-plan.md` - Added WI-013 implementation plan.
- `.copilot-tracking/changes/2026-02-24-wi-013-test-strategy-release-gates-changes.md` - Added WI-013 release tracking file.
- `.github/workflows/ci.yml` - Added CI workflow for tests and KPI gate checks.
- `src/backend/application/matching/kpi-gates.ts` - Added KPI gate evaluator for top-1/top-3/review-rate/no-match-rate.
- `src/backend/application/matching/kpi-gates.test.ts` - Added KPI gate evaluator tests.
- `src/backend/tests/e2e-smoke.test.ts` - Added backend e2e smoke test for week->match->cart->system baseline flow.
- `infrastructure/release-gates/check-kpi-gates.ts` - Added CLI checker for release-gate metrics JSON input.
- `infrastructure/release-gates/sample-metrics.json` - Added passing sample metrics for CI baseline.
- `infrastructure/release-gates/README.md` - Added release-gate checker usage documentation.

### Modified

- `src/backend/application/matching/index.ts` - Exported KPI gate evaluator and related types.
- `.copilot-tracking/plans/2026-02-24-wi-013-test-strategy-release-gates-plan.md` - Marked all WI-013 tasks complete.

### Removed

- _none_

## Release Summary

**Total Files Affected**: 11
