<!-- markdownlint-disable-file -->
# Release Changes: WI-006 Shared matching core single source of truth

**Related Plan**: 2026-02-24-wi-006-shared-matching-core-plan.md
**Implementation Date**: 2026-02-24

## Summary

Introduced a shared deterministic matching core, reused reconcile overlap logic from that core, and added parity tests for base-score invariance.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-006-shared-matching-core-plan.md` - Added WI-006 phased implementation plan.
- `.copilot-tracking/changes/2026-02-24-wi-006-shared-matching-core-changes.md` - Added WI-006 release change log.
- `src/backend/domain/matching/shared-core.ts` - Added shared matching types, score helpers, ranker, and policy resolver.
- `src/backend/domain/matching/index.ts` - Added shared matching exports.
- `src/backend/domain/matching/README.md` - Added module purpose and guardrails.
- `src/backend/domain/matching/shared-core.test.ts` - Added deterministic scoring and parity tests.

### Modified

- `src/backend/application/silver/reconcile.ts` - Replaced local token match math with shared `computeTokenOverlap` helper.
- `src/backend/application/silver/README.md` - Documented shared matching helper usage in reconcile.
- `src/backend/domain/README.md` - Documented location of shared matching core.
- `.copilot-tracking/plans/2026-02-24-wi-006-shared-matching-core-plan.md` - Marked WI-006 tasks complete.

### Removed

- _none_

## Release Summary

**Total Files Affected**: 10
