<!-- markdownlint-disable-file -->
# Release Changes: WI-014 Security/privacy baseline

**Related Plan**: 2026-02-24-wi-014-security-privacy-baseline-plan.md
**Implementation Date**: 2026-02-24

## Summary

Implemented security/privacy baseline for WI-014 by adding secret-file based config loading, stricter optional bearer token expiry validation, and centralized audit trail events across critical admin/system/matching/cart mutation flows.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-014-security-privacy-baseline-plan.md` - Added WI-014 implementation plan.
- `.copilot-tracking/changes/2026-02-24-wi-014-security-privacy-baseline-changes.md` - Added WI-014 release tracking file.
- `src/backend/application/audit/types.ts` - Added shared audit event contracts and filters.
- `src/backend/application/audit/audit-trail-service.ts` - Added central in-memory audit trail with sensitive-field redaction.
- `src/backend/application/audit/index.ts` - Added audit module exports.
- `src/backend/application/audit/README.md` - Added audit module usage notes.
- `src/backend/application/audit/audit-trail-service.test.ts` - Added audit trail unit tests.
- `src/backend/application/config/resolve-env-secrets.ts` - Added `<KEY>_FILE` secret resolver and typed errors.
- `src/backend/application/config/create-runtime-config.test.ts` - Added tests for env secret loading behavior.
- `src/backend/application/config/README.md` - Added backend config and secret fallback documentation.
- `src/backend/application/admin/admin-operations-service.test.ts` - Added audit coverage test for admin critical mutations.
- `src/backend/interfaces/http/auth/README.md` - Added bearer token format and expiry validation documentation.

### Modified

- `src/backend/application/config/create-runtime-config.ts` - Integrated env secret resolver into runtime config creation.
- `src/backend/interfaces/http/auth/session-context.ts` - Added optional token expiry parsing/validation and strict segment checks.
- `src/backend/interfaces/http/auth/session-context.test.ts` - Added expiry validation tests.
- `src/backend/application/admin/admin-operations-service.ts` - Added centralized audit event emission for admin operations.
- `src/backend/application/system/system-operations-service.ts` - Added centralized audit event emission for system operations, including rejected requests.
- `src/backend/application/matching/review-service.ts` - Added centralized audit event emission for decisions/review actions and rejected review actions.
- `src/backend/application/cart/sync-service.ts` - Added centralized audit event emission for sync/replay/rejection outcomes.
- `src/backend/application/system/system-operations-service.test.ts` - Added assertions for system audit events.
- `src/backend/application/matching/review-service.test.ts` - Added assertions for central matching audit events.
- `src/backend/application/cart/sync-service.test.ts` - Added assertions for sync/replay audit events.
- `src/backend/tests/e2e-smoke.test.ts` - Added shared audit trail wiring and smoke assertions.
- `src/shared/config/default-definitions.ts` - Marked `PG_EXTRA_HEADERS_JSON` as sensitive config.
- `src/shared/config/index.ts` - Updated module imports/exports for runtime-compatible TypeScript path resolution.
- `src/shared/config/runtime-config.ts` - Updated runtime-config type imports for runtime-compatible path resolution.
- `src/shared/config/types.ts` - Reworked `ConfigError` constructor to avoid unsupported parameter property syntax in strip-types runtime.
- `src/shared/config/README.md` - Documented `<KEY>_FILE` secret fallback.
- `src/backend/application/README.md` - Added `audit/` and `config/` modules to application overview.
- `src/backend/application/admin/README.md` - Documented audit emissions for admin operations.
- `src/backend/application/system/README.md` - Documented audit emissions for system operations.
- `src/backend/application/matching/README.md` - Documented central audit emissions for matching decisions/actions.
- `src/backend/application/cart/README.md` - Documented audit emissions for cart sync outcomes.
- `src/backend/interfaces/README.md` - Documented optional bearer expiry support.
- `src/backend/interfaces/http/README.md` - Added auth session-context route-layer reference.

### Removed

- _none_

## Release Summary

**Total Files Affected**: 35
