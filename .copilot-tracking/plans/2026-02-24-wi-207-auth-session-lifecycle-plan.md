<!-- markdownlint-disable-file -->
# Plan: WI-207 Real auth/session lifecycle for PG/Picnic + user/admin middleware

## Scope

Implement session lifecycle and middleware wiring baseline:
- add app-session lifecycle service for user/admin sessions (issue, validate, refresh, revoke)
- add provider-session lifecycle management for PG and Picnic access/refresh tokens with expiry rules
- add reusable auth middleware wrappers that validate bearer header + required session kind consistently
- persist auth/provider session state to survive process restart

Out of scope:
- full OAuth/OpenID provider integration and UI login flows
- cryptographic signing/JWT verification against external IdP keys

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/best_practices.md`

## Success Criteria

- [x] User/admin app sessions support expiry and refresh rotation with deterministic validation outcomes.
- [x] PG/Picnic provider sessions are tracked with expiry/refresh metadata and refresh guardrails.
- [x] Middleware wrappers enforce user/admin route session-kind checks using bearer headers.

## Tasks

### Phase 1: Session lifecycle domain + persistence

- [x] Add auth session lifecycle service and provider token session store with expiry/refresh rules.
- [x] Extend persistent state schema/migration for auth/provider session records.
- [x] Add unit tests for issue/validate/refresh/revoke and provider session refresh policies.

### Phase 2: Middleware wiring

- [x] Add shared middleware wrappers for user/admin route authorization header handling.
- [x] Add middleware tests for valid token, wrong kind, revoked token, and expired token paths.

### Phase 3: Tracking and docs

- [x] Update docs/tracking artifacts (`plans`, `changes`, `workitems`).
