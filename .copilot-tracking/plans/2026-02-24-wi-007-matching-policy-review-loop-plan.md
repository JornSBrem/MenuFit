<!-- markdownlint-disable-file -->
# Plan: WI-007 Matching policy review queue and feedback loop

## Scope

Implement the first matching decision and review workflow baseline:
- centralized decision gates (`high`, `medium`, `low`) with one threshold policy
- matching application service that evaluates ranked candidates with the shared core
- review actions (`map`, `skip`, `defer`) that persist both audit events and override records
- executable tests for gates and review action persistence

Out of scope:
- HTTP route wiring for `/api/v3/match`
- database persistence (in-memory baseline only)
- LLM finish-pass logic

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/MATCHING_SHARED_CORE_DESIGN.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Decision gates classify top match as `high`, `medium`, `low` via central thresholds.
- [x] Review actions `map`, `skip`, `defer` persist audit events and overrides.
- [x] Tests cover gate behavior and feedback-loop write behavior.

## Tasks

### Phase 1: Domain and contracts

- [x] Extend shared matching domain with confidence gate helpers/types.
- [x] Add matching application types for evaluation, queue items, audit, and overrides.

### Phase 2: Review workflow service

- [x] Implement in-memory matching review service using shared ranker and central policy.
- [x] Implement review action handler for `map`, `skip`, `defer` with audit + override writes.

### Phase 3: Validation and tracking

- [x] Add tests for gate classification and review action persistence.
- [x] Update WI-007 plan, changes, and workitem state.
