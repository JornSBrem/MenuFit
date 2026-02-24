<!-- markdownlint-disable-file -->
# Release Changes: WI-209 Admin web React/Vite UI uitwerken voor operations dashboards

**Related Plan**: 2026-02-24-wi-209-admin-web-operations-ui-plan.md
**Implementation Date**: 2026-02-24

## Summary

Implemented an admin dashboard interaction layer for Data/Instellingen/Extract/Operations views with deterministic `loading/empty/error/success` states, plus interactive ingest/recompute/cleanup/diagnostics and settings update flows backed by the admin API client.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-209-admin-web-operations-ui-plan.md`
- `.copilot-tracking/changes/2026-02-24-wi-209-admin-web-operations-ui-changes.md`
- `src/admin-web/src/admin-dashboard-controller.ts`
- `src/admin-web/src/admin-dashboard-controller.test.ts`

### Modified

- `workitems/workitems.md`
- `src/admin-web/src/types.ts`
- `src/admin-web/src/admin-api.ts`
- `src/admin-web/src/README.md`
- `src/admin-web/README.md`

### Removed

- _none_

## Validation

- `node --test --experimental-strip-types src/admin-web/src/admin-dashboard-controller.test.ts src/admin-web/src/admin-labels.test.ts src/admin-web/src/i18n/index.test.ts`

## Out-of-scope Conversion Check

Reviewed plan out-of-scope items when moving WI-209 to `DONE`:
- No new workitems added because both out-of-scope topics already exist as open items (`WI-212` and `WI-218`).

## Release Summary

**Total Files Affected**: 9
