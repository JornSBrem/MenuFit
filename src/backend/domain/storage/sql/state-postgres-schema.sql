-- Postgres runtime table for persistent MenuFit application state.
-- Maintains a single JSONB state document with schema version metadata.

CREATE TABLE IF NOT EXISTS menufit_state_store (
  state_id SMALLINT PRIMARY KEY CHECK (state_id = 1),
  schema_version INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  state_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS menufit_state_store_updated_at_idx
  ON menufit_state_store (updated_at DESC);
