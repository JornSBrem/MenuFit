<!-- markdownlint-disable-file -->
# Plan: WI-003 Silver transform pipeline

## Scope

Implement baseline silver transform pipeline with:
- normalize/canonicalize logic
- quantity normalization
- PDF reconcile results and quality events
- reprocess tooling with explicit `transformVersion`
- silver table schema definitions

Out of scope:
- gold serving models and routes
- production DB migration tooling
- advanced parser/LLM-assisted reconciliation

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/MATCHING_SHARED_CORE_DESIGN.md`
- `docs/REFACTOR_SIMPLIFICATION_PLAN.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Silver table definitions exist for weeks/meals/ingredients/quantities/reconcile/events.
- [x] Transform pipeline produces deterministic silver records from bronze-like payloads.
- [x] Reprocess helper reruns transforms for a provided `transformVersion`.

## Tasks

### Phase 1: Silver schema and models

- [x] Add silver SQL schema draft for required tables.
- [x] Add typed silver record models and pipeline context types.

### Phase 2: Transform logic

- [x] Add normalization and canonicalization helpers.
- [x] Add quantity normalization and unit-family handling.
- [x] Add reconcile classifier and quality event generator.

### Phase 3: Pipeline orchestration

- [x] Add bronze->silver transformer and deterministic row outputs.
- [x] Add reprocess helper with explicit `transformVersion`.
- [x] Update changes file and validate workitem state.
