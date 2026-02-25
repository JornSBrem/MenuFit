# WI-248 Changes

## Summary

- Added runtime config key/value validation to the admin dashboard controller before API submission.
- Added settings audit trail records with `operationId`, key/value, actor, and timestamp metadata.
- Extended controller tests to cover validation errors and audit trail behavior.

## Files

- `src/admin-web/src/admin-dashboard-controller.ts`
  - Added runtime config allowlist and value type checks for `updateConfig`.
  - Added in-memory audit trail collection with capped history.
  - Included settings audit trail in settings view state.
- `src/admin-web/src/types.ts`
  - Added `AdminConfigAuditEntry` and settings view `auditTrail` contract.
- `src/admin-web/src/admin-dashboard-controller.test.ts`
  - Added tests for invalid key/type rejection and successful audit trail tracking.
- `src/admin-web/README.md`
  - Documented WI-248 runtime config validation + audit behavior.

## Validation

- `node --test src/admin-web/src/admin-dashboard-controller.test.ts`

## Out-of-scope Conversion Check

- Added `WI-261` for rendered admin settings UI components.
- Added `WI-262` for persistent backend audit history for config changes.
