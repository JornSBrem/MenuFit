-- WI-003 silver schema draft
-- These tables model deterministic transform outputs derived from bronze payloads.

CREATE TABLE IF NOT EXISTS silver_ingest_runs (
  run_id TEXT PRIMARY KEY,
  transform_version TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS silver_weeks (
  week_id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  week INTEGER NOT NULL,
  kcal INTEGER NOT NULL,
  base_persons INTEGER NOT NULL,
  source_object_id TEXT NOT NULL,
  transform_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS silver_meals (
  meal_id TEXT PRIMARY KEY,
  week_id TEXT NOT NULL,
  day_label TEXT NOT NULL,
  meal_label TEXT NOT NULL,
  recipe_id TEXT,
  source_object_id TEXT NOT NULL,
  transform_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS silver_ingredients_raw (
  raw_id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL,
  ingredient_text TEXT NOT NULL,
  raw_unit TEXT,
  raw_amount TEXT,
  source_object_id TEXT NOT NULL,
  transform_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS silver_ingredients_canonical (
  canonical_id TEXT PRIMARY KEY,
  raw_id TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  canonical_ruleset_version TEXT NOT NULL,
  synonym_dict_version TEXT NOT NULL,
  source_object_id TEXT NOT NULL,
  transform_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS silver_quantities_normalized (
  quantity_id TEXT PRIMARY KEY,
  raw_id TEXT NOT NULL,
  normalized_amount REAL,
  normalized_unit TEXT,
  unit_family TEXT NOT NULL,
  requires_review INTEGER NOT NULL DEFAULT 0,
  source_object_id TEXT NOT NULL,
  transform_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS silver_pdf_lines (
  pdf_line_id TEXT PRIMARY KEY,
  week_id TEXT NOT NULL,
  line_text TEXT NOT NULL,
  source_object_id TEXT NOT NULL,
  transform_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS silver_reconcile_results (
  reconcile_id TEXT PRIMARY KEY,
  week_id TEXT NOT NULL,
  raw_id TEXT NOT NULL,
  reconcile_status TEXT NOT NULL,
  note TEXT,
  source_object_id TEXT NOT NULL,
  transform_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS silver_data_quality_events (
  event_id TEXT PRIMARY KEY,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  source_object_id TEXT NOT NULL,
  transform_version TEXT NOT NULL,
  created_at TEXT NOT NULL
);
