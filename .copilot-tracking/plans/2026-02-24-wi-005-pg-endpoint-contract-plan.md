<!-- markdownlint-disable-file -->
# Plan: WI-005 PG adapter endpoint contract and contract tests

## Scope

Implement an explicit PG endpoint contract layer and use it in ingest planning:
- central endpoint key/default/placeholder contract based on `docs/PG_ENDPOINT_CONTRACT.md`
- contract-driven URL resolution helpers for login/week/day/recipe/shoppingList
- response-shape contract assertions with focused tests
- refactor ingest planner to consume endpoint contract helpers

Out of scope:
- auth/session lifecycle implementation
- live network validation against PG endpoints
- bronze schema version bumping logic

## Docs Used

- `docs/PG_ENDPOINT_CONTRACT.md`
- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/best_practices.md`

## Success Criteria

- [x] PG adapter uses endpoint keys from the explicit endpoint contract layer.
- [x] Contract helpers build URLs per endpoint with required template variables.
- [x] Contract tests cover login/week/day/recipe/shoppinglist response shape checks.

## Tasks

### Phase 1: Contract layer

- [x] Extend `endpoint-contract.ts` with endpoint metadata and URL build helpers.
- [x] Add response-shape assertion helpers for login/week/day/recipe/shoppingList.

### Phase 2: Integration

- [x] Refactor ingest planner to consume contract-driven endpoint URL building.
- [x] Update PG integration README to reflect contract responsibilities.

### Phase 3: Validation and tracking

- [x] Add PG endpoint contract tests for URL and response-shape behavior.
- [x] Update change tracking and workitem state.
