<!-- markdownlint-disable-file -->
# Release Changes: WI-001 Milestone 0 foundations

**Related Plan**: 2026-02-24-wi-001-foundations-plan.md
**Implementation Date**: 2026-02-24

## Summary

Foundation scaffolding for MenuFit V3 module boundaries and runtime configuration subsystem.

## Changes

### Added

- `src/backend/README.md` - Added backend layer boundary definition for domain/application/integrations/interfaces/jobs.
- `src/backend/domain/README.md` - Added domain-layer guardrails for deterministic pure logic.
- `src/backend/domain/storage/medallion-schema.ts` - Added initial medallion storage metadata and lineage types.
- `src/backend/application/README.md` - Added application-layer orchestration scope guidance.
- `src/backend/application/config/create-runtime-config.ts` - Added backend helper to build runtime config from environment values.
- `src/backend/integrations/README.md` - Added external adapter boundary guidance.
- `src/backend/interfaces/README.md` - Added transport interface boundary guidance.
- `src/backend/interfaces/http/README.md` - Added planned API route group boundaries for `/api/v3/*`.
- `src/backend/jobs/README.md` - Added background-job boundary guidance.
- `src/admin-web/README.md` - Added admin-web boundary and scope definition.
- `src/ios-user-app/README.md` - Added iOS user-app boundary and scope definition.
- `src/shared/README.md` - Added shared-layer purpose and constraints.
- `src/shared/config/README.md` - Added runtime config subsystem description.
- `src/shared/config/types.ts` - Added config types, metadata model, and config error type.
- `src/shared/config/default-definitions.ts` - Added default config registry with `hotReload`/`sensitive`/`restartRequired` metadata.
- `src/shared/config/runtime-config.ts` - Added runtime config store with parse/validate/get/set/public redaction logic.
- `src/shared/config/index.ts` - Added config subsystem exports and default factory.
- `infrastructure/README.md` - Added infrastructure boundary and deployment profile scope.
- `infrastructure/environments/README.md` - Added environment profile scaffold for local and prod.
- `.copilot-tracking/plans/2026-02-24-wi-001-foundations-plan.md` - Added implementation plan for WI-001.
- `.copilot-tracking/changes/2026-02-24-wi-001-foundations-changes.md` - Added change tracking record for WI-001.

### Modified

- `.copilot-tracking/plans/2026-02-24-wi-001-foundations-plan.md` - Marked all WI-001 tasks and success criteria as complete.

### Removed

- _none_

## Release Summary

**Total Files Affected**: 21
