<!-- markdownlint-disable-file -->
# Plan: WI-202 Dynamic kcal profiles on baseline datasets

## Scope

Implement dynamic kcal profile reads on top of existing gold baseline models:
- keep baseline ingest/projection unchanged
- derive on-demand week/grocery response when requested kcal has no exact model
- scale quantitative grocery totals deterministically from closest baseline

Out of scope:
- extra bronze/silver ingest matrix expansion for arbitrary kcal values
- UI personalization settings and profile management screens

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Week summary/groceries can be returned for non-baseline kcal values when same week/basePersons baseline exists.
- [x] Derived grocery totals are deterministic and response contracts remain stable.
- [x] Exact-match and not-found behavior for unavailable week/basePersons combinations remains intact.

## Tasks

### Phase 1: Gold read derivation logic

- [x] Extend gold read service with baseline candidate resolution by year/week/basePersons.
- [x] Add deterministic kcal ratio scaling for grocery totals in derived profiles.
- [x] Keep exact-match path unchanged and avoid mutating persisted baseline models.

### Phase 2: Validation coverage

- [x] Add/extend unit tests for derived profile behavior, tie-breaking, and not-found boundaries.
- [x] Extend smoke coverage with non-baseline kcal request.

### Phase 3: Tracking and completion

- [x] Update docs/tracking artifacts (`plans`, `changes`, `workitems`).
