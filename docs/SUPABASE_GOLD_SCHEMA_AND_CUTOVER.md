<!-- markdownlint-disable-file -->
# Supabase Gold Schema And Cutover Notes

## Scope

This document translates WI-282 into an executable storage shape for MenuFit's gold serving layer.

Assets:
- `infrastructure/supabase/migrations/20260312133000_wi_282_gold_core.sql`
- `infrastructure/supabase/README.md`

## Storage decision

Supabase/Postgres becomes the primary relational store for:
- week plans
- meals
- recipes and recipe detail sections
- groceries and cart-plan summaries
- selected user-facing records that can live next to the serving layer
- import run metadata

Not part of this migration phase:
- raw bronze blobs
- most silver intermediate transform records
- migration of locally cached iOS recipe favorites
- row-level security policies

## Table mapping from current in-memory/local gold model

### `GoldWeekPlanView`

Maps to:
- `menufit_gold_week_plans`

### `GoldMealView`

Maps to:
- `menufit_gold_meals`
- recipe-linked detail tables when a recipe exists

### `RecipeView` and extra recipe fields

Maps to:
- `menufit_gold_recipes`
- `menufit_gold_recipe_tags`
- `menufit_gold_recipe_prep_times`
- `menufit_gold_recipe_ingredients`
- `menufit_gold_recipe_steps`
- `menufit_gold_recipe_tips`
- `menufit_gold_recipe_nutrition`
- `menufit_gold_linked_day_menus`

### `GoldGroceryTotalView`

Maps to:
- `menufit_gold_groceries`

### `GoldGroceryReconcileView`

Maps to:
- `menufit_gold_grocery_reconcile`

### `GoldCartPlanView`

Maps to:
- `menufit_gold_cart_plans`

## Cutover strategy

### Phase 1: schema first

- apply the initial migration in non-prod Supabase
- create repository layer for week plans, recipes and groceries
- do not switch reads yet

### Phase 2: backfill

- read current local persistent state
- materialize all `goldReadModels` into the Supabase schema
- materialize `recipeCatalog` into recipe tables
- record run metadata in `menufit_import_runs`

Current script:

```bash
node --experimental-strip-types scripts/backfill-supabase-gold.ts \
  --output out/supabase-gold-backfill.sql
```

Execute directly against Supabase/Postgres:

```bash
SUPABASE_GOLD_DATABASE_URL='postgres://...' \
node --experimental-strip-types scripts/backfill-supabase-gold.ts --execute
```

### Phase 3: dual-write

- when backend updates local gold state, also upsert Supabase gold rows
- parity checks compare counts and representative hashes between local and Supabase records
- local state remains rollback source until parity is stable

### Phase 4: read cutover

- move selected read routes to Supabase-backed repositories
- start with recipe catalog and week summaries
- keep a feature flag for rollback to local state

## Dual-write rules

- `week_plan_id` remains stable and is the upsert key
- `recipe_id` remains stable and is the upsert key
- child tables are replace-on-write per parent entity to avoid drift
- `updated_at` timestamps are maintained by backend writes, not by client devices

## What still needs implementation after this asset drop

- repository/adapters for Supabase gold writes
- backfill command or job
- read path switch behind feature flags
- RLS policies after WI-281 role consolidation

## Validation tooling

Backfill SQL:

```bash
node --experimental-strip-types scripts/backfill-supabase-gold.ts \
  --output out/supabase-gold-backfill.sql
```

Direct backfill:

```bash
SUPABASE_GOLD_DATABASE_URL='postgres://...' \
node --experimental-strip-types scripts/backfill-supabase-gold.ts --execute
```

Parity check:

```bash
SUPABASE_GOLD_DATABASE_URL='postgres://...' \
node --experimental-strip-types scripts/check-supabase-gold-parity.ts
```
