<!-- markdownlint-disable-file -->
# Release Changes: WI-201 Household model with head/member invitations

**Related Plan**: 2026-02-24-wi-201-household-invitations-plan.md
**Implementation Date**: 2026-02-24

## Summary

Implemented a backend household baseline with head/member roles and invitation lifecycle (`pending`, `accepted`, `revoked`), added `/api/v3/households/*` route handlers with user-session enforcement, and persisted household state via schema migration in the persistent state store.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-201-household-invitations-plan.md`
- `.copilot-tracking/changes/2026-02-24-wi-201-household-invitations-changes.md`
- `src/backend/application/household/types.ts`
- `src/backend/application/household/household-service.ts`
- `src/backend/application/household/household-service.test.ts`
- `src/backend/application/household/index.ts`
- `src/backend/application/household/README.md`
- `src/backend/interfaces/http/household/household-routes.ts`
- `src/backend/interfaces/http/household/household-routes.test.ts`
- `src/backend/interfaces/http/household/README.md`

### Modified

- `.gitignore`
- `workitems/workitems.md`
- `src/backend/application/README.md`
- `src/backend/interfaces/http/README.md`
- `src/backend/tests/e2e-smoke.test.ts`
- `src/backend/integrations/storage/persistent-state-store.ts`
- `src/backend/integrations/storage/persistent-state-store.test.ts`
- `src/backend/integrations/storage/README.md`

### Removed

- _none_

## Validation

- `node --test --experimental-strip-types src/backend/integrations/storage/persistent-state-store.test.ts src/backend/application/household/household-service.test.ts src/backend/interfaces/http/household/household-routes.test.ts src/backend/tests/e2e-smoke.test.ts`

## Out-of-scope Conversion Check

Reviewed the plan out-of-scope items when moving WI-201 to `DONE`:
- auth/session lifecycle and middleware wiring: already tracked as `WI-207`
- admin/iOS invitation UX integration: already tracked as `WI-209` and `WI-210`

No new workitems were added because relevant items already exist.

## Release Summary

**Total Files Affected**: 20
