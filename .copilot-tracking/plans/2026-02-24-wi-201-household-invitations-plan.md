<!-- markdownlint-disable-file -->
# Plan: WI-201 Household model with head/member invitations

## Scope

Implement a backend baseline for household membership management:
- add household domain/service with `head` and `member` role semantics
- add invitation lifecycle (`pending` -> `accepted` / `revoked`)
- expose user route handlers for household bootstrap, invite, accept, and status reads
- persist household + invitation state in persistent store

Out of scope:
- full auth/session lifecycle and middleware wiring (covered by WI-207)
- iOS/admin UI integration for invitation UX (covered by WI-210/WI-209)

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Household head can create/bootstrap a household and invite another user.
- [x] Invited user can accept invitation and becomes active member in same household.
- [x] State survives restart via persistent storage and routes enforce user-session boundaries.

## Tasks

### Phase 1: Domain/service and persistence model

- [x] Add household types and application service with role and invitation invariants.
- [x] Extend persistent state schema/migrations for households and invitations.
- [x] Add service tests for invite and accept flows including invalid role/session cases.

### Phase 2: HTTP user routes

- [x] Add `/api/v3/households/*` route handlers with payload validation and stable envelopes.
- [x] Enforce user-session access (head-only invite/revoke and invitee-only accept).
- [x] Add route tests for success + forbidden/invalid cases.

### Phase 3: Integration and tracking

- [x] Wire route/service in smoke coverage with persistence rehydration assertion.
- [x] Update docs and tracking artifacts (`plans`, `changes`, `workitems`).
