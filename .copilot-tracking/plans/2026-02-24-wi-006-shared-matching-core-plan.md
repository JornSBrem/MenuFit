<!-- markdownlint-disable-file -->
# Plan: WI-006 Shared matching core single source of truth

## Scope

Introduce a shared matching core module for deterministic base scoring:
- common matching types and score breakdown contracts
- reusable token-overlap/canonical scoring helpers
- deterministic candidate ranker with centralized policy
- parity test to guarantee identical base score for reconcile/picnic contexts

Out of scope:
- review queue workflow and persistence
- LLM reranker integration
- Picnic API retrieval integration

## Docs Used

- `docs/MATCHING_SHARED_CORE_DESIGN.md`
- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Shared matching types, score helpers, and ranker exist in one module.
- [x] Reconcile path uses shared base score helper instead of separate matching math.
- [x] Parity test proves equal base score for equal input and candidate set.

## Tasks

### Phase 1: Shared core module

- [x] Add shared matching types and scoring breakdown definitions.
- [x] Add deterministic token-overlap and canonical scoring helpers.
- [x] Add reusable ranker and centralized default policy.

### Phase 2: Reuse in reconcile path

- [x] Refactor silver reconcile matching checks to call shared score helper.
- [x] Keep reconcile statuses and quality events behavior stable.

### Phase 3: Validation and tracking

- [x] Add parity test for reconcile vs picnic base-score invariance.
- [x] Update WI-006 change tracking and workitem state.
