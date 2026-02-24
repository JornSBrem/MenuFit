<!-- markdownlint-disable-file -->
# Plan: WI-205 Match API routes and LLM finish-pass end-to-end wiring

## Scope

Implement end-to-end match flow wiring that is currently missing:
- add `/api/v3/match/*` route handlers with stable contracts
- add application orchestration for match evaluation + optional LLM finish-pass
- connect finish-pass flow with review queue actions

Out of scope:
- persistent storage for queue/audit/mapping (handled by persistence workitems)
- production auth middleware integration (handled by auth/session workitem)

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/MATCHING_SHARED_CORE_DESIGN.md`
- `docs/best_practices.md`

## Success Criteria

- [x] `/api/v3/match/*` routes are available with stable request/response contracts.
- [x] Shared matching core, review loop, and LLM adapter are wired in one end-to-end flow.

## Tasks

### Phase 1: Matching orchestration service

- [x] Add application service for evaluate + optional LLM finish-pass orchestration.
- [x] Add deterministic parser for finish-pass suggestion and review-action integration.

### Phase 2: HTTP match routes

- [x] Add `/api/v3/match/*` route handlers for evaluate, queue list, and review action.
- [x] Add route-level validation and stable API envelopes/error codes.

### Phase 3: Validation and tracking

- [x] Add/extend tests for orchestration and route contracts.
- [x] Wire match routes into smoke coverage and update docs/tracking artifacts.
