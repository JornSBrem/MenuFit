<!-- markdownlint-disable-file -->
# Release Changes: WI-009 Cart plan idempotent sync and sync reports

**Related Plan**: 2026-02-24-wi-009-cart-sync-plan.md
**Implementation Date**: 2026-02-24

## Summary

Implemented an idempotent cart sync baseline with clear sync reports, admin-only dry-run enforcement, and `/api/v3/cart/sync` route handlers.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-24-wi-009-cart-sync-plan.md` - Added WI-009 implementation plan.
- `.copilot-tracking/changes/2026-02-24-wi-009-cart-sync-changes.md` - Added WI-009 change tracking file.
- `src/backend/application/cart/types.ts` - Added cart sync request/report contracts.
- `src/backend/application/cart/sync-service.ts` - Added idempotent cart sync service and dry-run guard.
- `src/backend/application/cart/sync-service.test.ts` - Added tests for replay and dry-run behavior.
- `src/backend/application/cart/index.ts` - Added cart module exports.
- `src/backend/application/cart/README.md` - Added cart module scope notes.
- `src/backend/integrations/picnic/cart-sync.ts` - Added Picnic cart sync adapter contract and noop implementation.
- `src/backend/integrations/picnic/README.md` - Added Picnic integration module notes.
- `src/backend/interfaces/http/cart/cart-routes.ts` - Added cart sync route handler and envelope mapping.
- `src/backend/interfaces/http/cart/cart-routes.test.ts` - Added route tests for validation, service error mapping, and idempotent replay.
- `src/backend/interfaces/http/cart/README.md` - Added cart route module notes.

### Modified

- `src/backend/application/README.md` - Added `cart/` workflow module listing.
- `src/backend/interfaces/http/README.md` - Documented implemented cart route baseline.
- `src/backend/integrations/README.md` - Documented Picnic integration module path.
- `.copilot-tracking/plans/2026-02-24-wi-009-cart-sync-plan.md` - Marked all WI-009 tasks complete.

### Removed

- _none_

## Release Summary

**Total Files Affected**: 16
