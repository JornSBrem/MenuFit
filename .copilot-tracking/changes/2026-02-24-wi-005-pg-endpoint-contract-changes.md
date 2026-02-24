<!-- markdownlint-disable-file -->
# Release Changes: WI-005 PG adapter endpoint contract and contract tests

**Related Plan**: 2026-02-24-wi-005-pg-endpoint-contract-plan.md
**Implementation Date**: 2026-02-24

## Summary

PG adapter endpoint contract expanded with URL/shape guards, ingest planner integration, and executable contract tests.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-005-pg-endpoint-contract-plan.md` - Added WI-005 implementation plan and completion checklist.
- `.copilot-tracking/changes/2026-02-24-wi-005-pg-endpoint-contract-changes.md` - Added WI-005 change tracking record.
- `src/backend/integrations/pg/endpoint-contract.test.ts` - Added contract tests for endpoint keys, URL templating, and response-shape validation.

### Modified

- `src/backend/integrations/pg/endpoint-contract.ts` - Added explicit endpoint contract metadata, entity-to-endpoint mapping, template rendering helpers, and response-shape assertions.
- `src/backend/application/ingest/ingest-planner.ts` - Replaced inline template replacement with contract-driven URL builder usage.
- `src/backend/integrations/pg/README.md` - Documented explicit contract helpers and new test coverage.
- `.copilot-tracking/plans/2026-02-24-wi-005-pg-endpoint-contract-plan.md` - Marked WI-005 tasks and success criteria complete.

### Removed

- _none_

## Release Summary

**Total Files Affected**: 6
