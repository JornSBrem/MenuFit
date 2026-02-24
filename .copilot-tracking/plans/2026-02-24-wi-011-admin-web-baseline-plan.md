<!-- markdownlint-disable-file -->
# Plan: WI-011 Admin web baseline and strict session separation

## Scope

Implement admin baseline artifacts with strict user/admin separation:
- admin-only backend handlers for ingest, recompute, config update, cleanup
- explicit session context separation between user and admin routes
- admin-web baseline modules for Data/Instellingen/Extract/Operations
- tests that verify admin-only access guards

Out of scope:
- full React/Vite admin UI rendering
- persistent auth/token issuance
- production RBAC middleware

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `src/admin-web/README.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Ingest/recompute/config/cleanup handlers are admin-session only.
- [x] User and admin sessions are represented and enforced as distinct types.
- [x] Admin-web baseline modules exist for Data/Instellingen/Extract/Operations workflows.

## Tasks

### Phase 1: Session separation and admin services

- [x] Add user/admin session context parsing and guard helpers.
- [x] Add admin operations application service for ingest/recompute/config/cleanup.

### Phase 2: Admin route and web baseline

- [x] Add `/api/v3/admin` route handlers protected by admin-session guard.
- [x] Add `src/admin-web/src` baseline modules for admin session API usage and dashboard state.

### Phase 3: Validation and tracking

- [x] Add tests for session separation and admin-only route enforcement.
- [x] Update WI-011 tracking files and workitem status.
