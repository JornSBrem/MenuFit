<!-- markdownlint-disable-file -->
# Release Changes: WI-002 Bronze ingest pipeline

**Related Plan**: 2026-02-24-wi-002-bronze-ingest-plan.md
**Implementation Date**: 2026-02-24

## Summary

Baseline bronze ingest planner and runner with manifest, integrity checks, and retry/backoff.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-002-bronze-ingest-plan.md` - Added WI-002 implementation plan with phased checklist.
- `.copilot-tracking/changes/2026-02-24-wi-002-bronze-ingest-changes.md` - Added WI-002 change tracking record.
- `src/backend/application/ingest/types.ts` - Added ingest domain/application types for tasks, manifest records, and retry policy.
- `src/backend/application/ingest/ingest-planner.ts` - Added planner for week/kcal/basePersons ingest matrix and endpoint URL generation.
- `src/backend/application/ingest/retry.ts` - Added reusable retry helper with exponential backoff.
- `src/backend/application/ingest/bronze-manifest.ts` - Added manifest read/append persistence for ingest records.
- `src/backend/application/ingest/bronze-runner.ts` - Added runner that fetches, validates checksums, writes bronze files, and appends manifest entries.
- `src/backend/application/ingest/index.ts` - Added ingest module exports.
- `src/backend/application/ingest/README.md` - Added usage guidance and boundary notes for WI-002 ingest baseline.
- `src/backend/integrations/pg/endpoint-contract.ts` - Added explicit PG endpoint keys/defaults based on contract doc.
- `src/backend/integrations/pg/pg-fetch.ts` - Added PG JSON fetch helper with configurable extra headers from runtime config.
- `src/backend/integrations/pg/README.md` - Added integration notes for PG endpoint contract and fetch helper scope.
- `src/backend/integrations/storage/bronze-storage.ts` - Added bronze path builder, JSON writer, and checksum helpers.
- `src/backend/integrations/storage/README.md` - Added storage integration notes for bronze persistence and integrity helpers.

### Modified

- `.copilot-tracking/plans/2026-02-24-wi-002-bronze-ingest-plan.md` - Marked all WI-002 tasks and success criteria complete.
- `src/shared/config/default-definitions.ts` - Added `PG_SHOPPINGLIST_URL_TEMPLATE` config key to align with endpoint contract.

### Removed

- _none_

## Release Summary

**Total Files Affected**: 16
