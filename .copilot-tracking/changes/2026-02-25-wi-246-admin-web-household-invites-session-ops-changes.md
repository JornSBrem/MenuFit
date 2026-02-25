# WI-246 Changes

## Summary

- Extended admin-web operation contracts for household status, invitations, and user session diagnostics.
- Added support controller actions for invite resend and session reset.
- Added targeted test coverage for the new household/session operations flow.

## Files

- `src/admin-web/src/types.ts`
  - Added household/session operation DTOs and request contracts.
  - Extended operations view data with household, invitation, and session status collections.
- `src/admin-web/src/admin-api.ts`
  - Added API methods for household statuses, invitations, invite resend, session reset, and session diagnose.
- `src/admin-web/src/admin-dashboard-controller.ts`
  - Added `loadHouseholdOperations`, `resendInvitation`, `resetSession`, and `diagnoseSession`.
  - Preserved operation history while merging household/session status results.
- `src/admin-web/src/admin-dashboard-controller.test.ts`
  - Added end-to-end controller unit test for household/session operation flow.
- `src/admin-web/README.md`
  - Documented WI-246 operation scope.

## Validation

- `node --test src/admin-web/src/admin-dashboard-controller.test.ts`

## Out-of-scope Conversion Check

- Added `WI-260` for full rendered admin UI components for household/session operations.
