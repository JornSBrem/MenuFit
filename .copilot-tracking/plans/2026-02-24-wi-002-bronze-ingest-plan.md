<!-- markdownlint-disable-file -->
# Plan: WI-002 Bronze ingest pipeline

## Scope

Implement baseline bronze ingest flow with:
- ingest planner for week/kcal/basePersons combinations
- ingest runner that writes immutable bronze files
- manifest and integrity checks
- retry/backoff for external fetch failures

Out of scope:
- full PG authentication/session handling
- silver/gold transforms
- production scheduler wiring

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/PG_ENDPOINT_CONTRACT.md`
- `docs/REFACTOR_SIMPLIFICATION_PLAN.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Planner generates executable ingest tasks for requested combinations.
- [x] Runner persists bronze files using required metadata and path structure.
- [x] Manifest stores ingest records with checksum verification status.
- [x] External fetch has configurable retry with backoff.

## Tasks

### Phase 1: Planner and models

- [x] Add ingest task and run models.
- [x] Implement planner for week/kcal/basePersons matrix.

### Phase 2: Runner and storage

- [x] Implement bronze path builder and writer.
- [x] Implement checksum computation and metadata validation.
- [x] Implement manifest store.

### Phase 3: Resilience and docs

- [x] Add retry/backoff wrapper for external fetch.
- [x] Add PG endpoint contract mapping for ingest requests.
- [x] Update changes file and validate structure.
