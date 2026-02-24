<!-- markdownlint-disable-file -->
# Plan: WI-009 Cart plan idempotent sync and sync reports

## Scope

Implement baseline cart sync workflow with idempotency guarantees:
- application cart sync service with deterministic idempotency key handling
- clear sync report contract for success/failure/replay/dry-run
- route handler baseline for `/api/v3/cart/sync`
- admin-only dry-run enforcement (not allowed in user flow)
- tests covering idempotency and dry-run restrictions

Out of scope:
- real Picnic API authentication/session lifecycle
- persistent storage for idempotency reports
- full admin/user auth middleware wiring

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Sync endpoint/service is idempotent and returns consistent sync report payload.
- [x] Dry-run is accepted only for admin/debug flow and rejected for user flow.
- [x] Tests prove replay behavior and dry-run restriction behavior.

## Tasks

### Phase 1: Cart sync contracts and service

- [x] Add cart sync types for requests and reports.
- [x] Implement in-memory idempotent cart sync service with replay report semantics.

### Phase 2: Route handler baseline

- [x] Add cart route handlers for sync endpoint with validation and error envelopes.
- [x] Wire route factory similar to existing week routes.

### Phase 3: Validation and tracking

- [x] Add tests for idempotent replay and admin-only dry-run.
- [x] Update WI-009 tracking and workitem state.
