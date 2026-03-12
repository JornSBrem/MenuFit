<!-- markdownlint-disable-file -->
# Plan: WI-282 Supabase gold schema

## Scope

Define and scaffold the initial Supabase/Postgres gold schema and migration assets for MenuFit serving data. This phase focuses on the schema foundation, migration layout and an executable backfill/dual-write direction. It does not yet fully replace the existing local state store.

In scope:
- target gold tables for weeks, meals, recipes, nutrition and shopping data
- migration folder layout and initial SQL migrations
- dual-write/backfill strategy documentation

Out of scope:
- complete backend read switch to Supabase
- complete write-through implementation for every route
- RLS policy implementation

## Success Criteria

- [ ] Supabase migration assets exist in-repo for the initial gold schema.
- [ ] Gold schema covers current MenuFit serving concepts.
- [ ] A concrete backfill/dual-write path is documented.
- [ ] Follow-up implementation for backend write/read cutover is unambiguous.

## Tasks

### Phase 1: Preparation

- [ ] Mark WI-282 as `IN-PROGRESS`.
- [ ] Inspect existing gold schema drafts and storage conventions.

### Phase 2: Implementation

- [ ] Add Supabase migration directory and initial SQL migration for gold core tables.
- [ ] Add supporting schema documentation and cutover notes.
- [ ] Align naming with current MenuFit recipe/week/shopping models.

### Phase 3: Validation

- [ ] Review schema against current gold serving concepts.
- [ ] Leave WI-282 status consistent with delivered scope.
