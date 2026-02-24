<!-- markdownlint-disable-file -->
# Release Changes: WI-207 Auth/session lifecycle for PG/Picnic + user/admin middleware

**Related Plan**: 2026-02-24-wi-207-auth-session-lifecycle-plan.md
**Implementation Date**: 2026-02-24

## Summary

Implemented a persistent session lifecycle baseline for user/admin app sessions and PG/Picnic provider sessions, including expiry/refresh/revoke rules and shared bearer-header middleware wrappers that enforce required session kind consistently.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-207-auth-session-lifecycle-plan.md`
- `.copilot-tracking/changes/2026-02-24-wi-207-auth-session-lifecycle-changes.md`
- `src/backend/application/auth/types.ts`
- `src/backend/application/auth/session-lifecycle-service.ts`
- `src/backend/application/auth/session-lifecycle-service.test.ts`
- `src/backend/application/auth/index.ts`
- `src/backend/application/auth/README.md`
- `src/backend/interfaces/http/auth/session-middleware.ts`
- `src/backend/interfaces/http/auth/session-middleware.test.ts`

### Modified

- `workitems/workitems.md`
- `src/backend/application/README.md`
- `src/backend/integrations/storage/persistent-state-store.ts`
- `src/backend/integrations/storage/persistent-state-store.test.ts`
- `src/backend/integrations/storage/README.md`
- `src/backend/interfaces/http/README.md`
- `src/backend/interfaces/http/auth/README.md`

### Removed

- _none_

## Validation

- `node --test --experimental-strip-types src/backend/application/auth/session-lifecycle-service.test.ts`
- `node --test --experimental-strip-types src/backend/interfaces/http/auth/session-context.test.ts src/backend/interfaces/http/auth/session-middleware.test.ts`
- `node --test --experimental-strip-types src/backend/integrations/storage/persistent-state-store.test.ts`
- `node --test --experimental-strip-types src/backend/interfaces/http/admin/admin-routes.test.ts src/backend/application/admin/admin-operations-service.test.ts`
- `node --test --experimental-strip-types src/backend/tests/e2e-smoke.test.ts`

## Out-of-scope Conversion Check

Reviewed plan out-of-scope items when moving WI-207 to `DONE`:
- Added `WI-220` for full OAuth/OpenID provider integration and login flow.
- Added `WI-221` for cryptographic JWT signature verification against IdP keys.

## Release Summary

**Total Files Affected**: 16
