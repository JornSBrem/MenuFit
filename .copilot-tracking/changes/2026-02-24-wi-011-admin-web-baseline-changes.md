<!-- markdownlint-disable-file -->
# Release Changes: WI-011 Admin web baseline and strict session separation

**Related Plan**: 2026-02-24-wi-011-admin-web-baseline-plan.md
**Implementation Date**: 2026-02-24

## Summary

Added admin-only backend operation routes for ingest/recompute/config/cleanup, strict user/admin session context separation, and admin-web baseline modules for Data/Instellingen/Extract/Operations workflows.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-011-admin-web-baseline-plan.md` - Added WI-011 implementation plan.
- `.copilot-tracking/changes/2026-02-24-wi-011-admin-web-baseline-changes.md` - Added WI-011 release tracking file.
- `src/backend/interfaces/http/auth/session-context.ts` - Added explicit user/admin session context contracts and guard helpers.
- `src/backend/interfaces/http/auth/session-context.test.ts` - Added session separation and auth header parsing tests.
- `src/backend/application/admin/types.ts` - Added admin operation/config contract types.
- `src/backend/application/admin/admin-operations-service.ts` - Added admin operations service for ingest/recompute/config/cleanup.
- `src/backend/application/admin/index.ts` - Added admin application exports.
- `src/backend/application/admin/README.md` - Added admin operations module notes.
- `src/backend/interfaces/http/admin/admin-routes.ts` - Added admin-only route handlers for ingest/recompute/configUpdate/cleanup.
- `src/backend/interfaces/http/admin/admin-routes.test.ts` - Added admin route guard/enforcement tests.
- `src/backend/interfaces/http/admin/README.md` - Added admin routes module notes.
- `src/admin-web/src/types.ts` - Added admin-web contracts and envelope types.
- `src/admin-web/src/admin-api.ts` - Added admin-session API client for `/api/v3/admin/*`.
- `src/admin-web/src/admin-dashboard-state.ts` - Added dashboard state model for Data/Instellingen/Extract/Operations flows.
- `src/admin-web/src/README.md` - Added admin-web baseline module documentation.

### Modified

- `src/backend/application/README.md` - Documented new `admin/` application module.
- `src/backend/interfaces/http/README.md` - Documented implemented admin route baseline.
- `src/backend/interfaces/README.md` - Documented session separation location in HTTP interfaces.
- `src/admin-web/README.md` - Documented WI-011 admin-web baseline modules and separation rule.
- `.copilot-tracking/plans/2026-02-24-wi-011-admin-web-baseline-plan.md` - Marked all WI-011 tasks complete.

### Removed

- _none_

## Release Summary

**Total Files Affected**: 20
