<!-- markdownlint-disable-file -->
# Release Changes: WI-279 Supabase admin login

**Related Plan**: `.copilot-tracking/plans/2026-03-12-wi-279-supabase-admin-login-plan.md`
**Implementation Date**: `2026-03-12`

## Summary

The hosted admin web login on `app.menufit.uk` now supports Supabase email/password sign-in through MenuFit backend endpoints. This removes the manual token copy/paste requirement for normal admin users while keeping the existing token-based dev fallback.

## Changes

### Added

- `/.copilot-tracking/plans/2026-03-12-wi-279-supabase-admin-login-plan.md` - implementation plan for the Supabase admin login change.
- `/.copilot-tracking/changes/2026-03-12-wi-279-supabase-admin-login-changes.md` - delivery record for WI-279.
- `/src/backend/server.ts` - public Supabase auth bootstrap/login endpoints for admin web sign-in.

### Modified

- `/src/admin-web/app/src/components/LoginGate.tsx` - switched primary login flow from local MenuFit username auth to Supabase email/password auth.
- `/src/admin-web/app/src/App.tsx` - only persists a session after admin API validation succeeds.
- `/src/admin-web/app/src/tabs/SettingsTab.tsx` - allows editing Supabase runtime config values.
- `/src/admin-web/src/admin-dashboard-controller.ts` - allows Supabase config keys in admin config updates.
- `/src/admin-web/src/renderers/settings-renderer.ts` - exposes Supabase config keys in the settings schema.
- `/src/shared/config/default-definitions.ts` - added `SUPABASE_ANON_KEY` runtime config definition.
- `/workitems/workitems.md` - tracked WI-279 through backlog and done state.

### Removed

- None.

## Validation

- `npm run typecheck` in `src/admin-web/app`
- `node --experimental-strip-types --check src/backend/server.ts`

## Release Summary

**Total Files Affected**: `9`
