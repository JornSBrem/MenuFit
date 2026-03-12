-- WI-282: Add category column to gold groceries table
-- Preserves PG API grocery categories (vegetables_fruit, dairy, etc.)

alter table public.menufit_gold_groceries
  add column if not exists category text;
