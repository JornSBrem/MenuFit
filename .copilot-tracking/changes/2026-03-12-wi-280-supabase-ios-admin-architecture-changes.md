<!-- markdownlint-disable-file -->
# Release Changes: WI-280 Supabase + iOS admin architecture

**Related Plan**: `.copilot-tracking/plans/2026-03-12-wi-280-supabase-ios-admin-architecture-plan.md`
**Implementation Date**: `2026-03-12`

## Summary

Documented the target architecture for moving MenuFit toward Supabase-backed auth/roles and gold-data storage while replacing the separate admin web portal with a role-gated admin mode in the iOS app. The spike also translated the architecture into concrete follow-up workitems.

## Changes

### Added

- `/docs/SUPABASE_IOS_ADMIN_TARGET_ARCHITECTURE.md` - target architecture, storage split, role model and migration path.
- `/.copilot-tracking/plans/2026-03-12-wi-280-supabase-ios-admin-architecture-plan.md` - execution plan for the architecture spike.
- `/.copilot-tracking/changes/2026-03-12-wi-280-supabase-ios-admin-architecture-changes.md` - delivery record for WI-280.

### Modified

- `/workitems/workitems.md` - added WI-280 and the follow-up implementation workitems WI-281 through WI-285.

### Removed

- None.

## Validation

- Architecture reviewed against `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- Architecture reviewed against `docs/REFACTOR_SIMPLIFICATION_PLAN.md`

## Release Summary

**Total Files Affected**: `4`
