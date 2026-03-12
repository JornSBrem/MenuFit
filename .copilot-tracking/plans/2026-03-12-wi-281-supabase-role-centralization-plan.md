<!-- markdownlint-disable-file -->
# Plan: WI-281 Supabase role centralization

## Scope

Centralize MenuFit admin authorization around Supabase as the canonical role source. Reduce reliance on local backend-only admin role mapping, and expose enough session role awareness for iOS/admin-mode gating.

In scope:
- backend claim parsing and canonical role resolution
- backend admin auth policy aligned to Supabase roles
- iOS session model extension for admin role awareness

Out of scope:
- full iOS admin mode UI
- RLS policy rollout
- removal of all dev fallback tokens

## Success Criteria

- [x] Backend resolves `user`, `operator`, `owner` from Supabase claims consistently.
- [x] Admin routes no longer require local account mapping as primary path.
- [x] iOS session state can expose admin role for UI gating.
- [x] Existing dev fallback remains explicit and secondary.

## Tasks

### Phase 1: Preparation

- [x] Inspect current backend role derivation and iOS auth/session state.
- [x] Define canonical Supabase role extraction rules.

### Phase 2: Implementation

- [x] Refactor backend auth to prefer Supabase role source.
  - Created `role-resolver.ts` with `resolveAdminRoleFromClaims()` as single source of truth.
  - Priority: `app_metadata.role` > `menufit:role` > `roles` > `role`.
  - Replaced duplicate implementations in `oauth-flow-service.ts` and `server.ts`.
- [x] Update iOS auth/session types with admin role awareness.
  - Extended `UserAuthSession` with `adminRole` and `isAdmin` computed property.
  - Extended `SupabaseUser` to decode `app_metadata` for role extraction.
  - Login and signup flows propagate `adminRole` from Supabase response.
  - `AuthSessionStore` preserves `adminRole` across token refreshes.
- [x] Keep fallback path only where needed for local development.
  - Token-based login (dev) remains available as explicit secondary path.
  - Backend `getAdminSession()` still falls back to `ensureAccount().adminRole` when JWT claims have no role.

### Phase 3: Validation

- [x] Add/adjust tests for backend role derivation and session handling.
  - 14 tests for `resolveAdminRoleFromClaims` covering all claim sources, priority, case-insensitivity.
  - 8 existing `oauth-flow-service` tests pass with refactored code.
- [x] Leave backlog/tracking consistent.

## Remaining manual step

To activate admin roles for Supabase users, set `app_metadata.role` to `"owner"` or `"operator"` via:
- Supabase Dashboard → Authentication → Users → Edit user → app_metadata
- Or via Supabase Admin API / Edge Function
