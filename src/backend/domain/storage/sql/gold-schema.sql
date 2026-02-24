-- WI-004 gold schema draft
-- App-ready views/tables for read routes without external calls.

CREATE TABLE IF NOT EXISTS gold_week_plan (
  week_plan_id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  week INTEGER NOT NULL,
  kcal INTEGER NOT NULL,
  base_persons INTEGER NOT NULL,
  meal_count INTEGER NOT NULL,
  generated_at TEXT NOT NULL,
  source_object_id TEXT NOT NULL,
  transform_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gold_grocery_totals (
  grocery_total_id TEXT PRIMARY KEY,
  week_plan_id TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  total_amount REAL,
  unit TEXT,
  requires_review INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS gold_grocery_reconcile (
  reconcile_id TEXT PRIMARY KEY,
  week_plan_id TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  reconcile_status TEXT NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS gold_match_results (
  match_result_id TEXT PRIMARY KEY,
  week_plan_id TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  status TEXT NOT NULL,
  confidence REAL
);

CREATE TABLE IF NOT EXISTS gold_cart_plan (
  cart_plan_id TEXT PRIMARY KEY,
  week_plan_id TEXT NOT NULL,
  item_count INTEGER NOT NULL,
  unresolved_count INTEGER NOT NULL,
  generated_at TEXT NOT NULL
);
