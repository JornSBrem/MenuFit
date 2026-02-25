# WI-249 Changes

## Summary

- Added admin-web data management contracts for recipes, week menus, and mapping overrides.
- Extended dashboard controller with load/upsert/delete workflows for those entities.
- Added unit-test coverage that verifies CRUD state transitions and operation history integration.

## Files

- `src/admin-web/src/types.ts`
  - Added core data management DTOs and request contracts for recipes, week menus, and mapping overrides.
  - Extended data-view payload with managed entity collections.
- `src/admin-web/src/admin-api.ts`
  - Added list/upsert/delete API methods for recipes, week menus, and mapping overrides.
- `src/admin-web/src/admin-dashboard-controller.ts`
  - Added in-memory stores for managed entities.
  - Added `loadDataManagement`, `upsert*`, and `delete*` controller workflows.
  - Added data-view refresh logic to surface immediate changes after successful operations.
- `src/admin-web/src/admin-dashboard-controller.test.ts`
  - Added fixtures and a full data-management workflow test covering load/upsert/delete paths.
- `src/admin-web/README.md`
  - Documented WI-249 data management contract scope.

## Validation

- `node --test src/admin-web/src/admin-dashboard-controller.test.ts`

## Out-of-scope Conversion Check

- Added `WI-263` for rendered admin data management UI components.
- Added `WI-264` for backend endpoint implementation backing admin data management contracts.
