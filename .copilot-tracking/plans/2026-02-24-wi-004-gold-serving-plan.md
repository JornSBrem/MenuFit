<!-- markdownlint-disable-file -->
# Plan: WI-004 Gold serving layer and week read routes

## Scope

Implement baseline gold serving layer from silver outputs and expose week read route handlers:
- gold view models for week plan, grocery totals/reconcile, match status, cart plan
- deterministic projection from silver transform output to gold read model
- week route module for `/api/v3/week/*` handlers

Out of scope:
- full Fastify server bootstrap wiring
- persistence in database tables
- auth and role-based guards

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/REFACTOR_SIMPLIFICATION_PLAN.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Gold view types exist for week plan, groceries, match status and cart plan.
- [x] Projection creates app-ready read model without external API calls.
- [x] Week route module provides stable response envelopes for summary and groceries.

## Tasks

### Phase 1: Gold schema and models

- [x] Add gold SQL schema draft.
- [x] Add typed gold view models and route response contracts.

### Phase 2: Projection and read service

- [x] Implement silver->gold projection with deterministic calculations.
- [x] Implement in-memory gold read service for week summary and grocery projections.

### Phase 3: Week route layer

- [x] Implement `/api/v3/week/summary` and `/api/v3/week/groceries` route handlers.
- [x] Add route registration helper for week read endpoints.
- [x] Update changes tracking and workitem state.
