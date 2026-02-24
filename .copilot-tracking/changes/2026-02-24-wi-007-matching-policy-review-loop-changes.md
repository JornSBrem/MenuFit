<!-- markdownlint-disable-file -->
# Release Changes: WI-007 Matching policy review queue and feedback loop

**Related Plan**: 2026-02-24-wi-007-matching-policy-review-loop-plan.md
**Implementation Date**: 2026-02-24

## Summary

Added centralized match decision gates, an in-memory review queue/feedback workflow, and tests for threshold classification plus audit/override writes.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-007-matching-policy-review-loop-plan.md` - Added WI-007 phased plan for matching policy and review loop.
- `.copilot-tracking/changes/2026-02-24-wi-007-matching-policy-review-loop-changes.md` - Added WI-007 change tracking file.
- `src/backend/application/matching/types.ts` - Added matching workflow contracts for evaluations, queue items, review actions, audit events, and overrides.
- `src/backend/application/matching/review-service.ts` - Added in-memory review service with centralized decision gates and review action handling.
- `src/backend/application/matching/review-service.test.ts` - Added tests for gate behavior and `map`/`skip`/`defer` persistence.
- `src/backend/application/matching/index.ts` - Added matching application exports.
- `src/backend/application/matching/README.md` - Added module scope and guardrails.

### Modified

- `src/backend/domain/matching/shared-core.ts` - Added confidence classification helper for `high`/`medium`/`low` decisions.
- `src/backend/domain/matching/index.ts` - Exported new confidence types and classifier.
- `src/backend/domain/matching/shared-core.test.ts` - Added threshold classification test coverage.
- `src/backend/domain/matching/README.md` - Documented centralized confidence gates.
- `src/backend/application/silver/reconcile.ts` - Switched to explicit `.ts` shared-core import for Node strip-types runtime compatibility.
- `src/backend/application/README.md` - Documented new `application/matching` workflow module.
- `AGENTS.md` - Added workflow rule for creating new workitems when list is empty.
- `.copilot-tracking/plans/2026-02-24-wi-007-matching-policy-review-loop-plan.md` - Marked all tasks and success criteria complete.

### Removed

- _none_

## Release Summary

**Total Files Affected**: 14
