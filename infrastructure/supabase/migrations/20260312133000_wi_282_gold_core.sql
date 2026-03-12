-- WI-282
-- Initial Supabase/Postgres schema for MenuFit gold serving data.
-- Focus: current read models for weeks, meals, recipes, groceries and a small
-- set of user-facing records that need to live alongside serving data.

create table if not exists public.menufit_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'user' check (role in ('user', 'operator', 'owner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menufit_gold_week_plans (
  week_plan_id text primary key,
  year integer not null,
  week integer not null,
  kcal integer not null,
  base_persons integer not null,
  meal_count integer not null,
  source_object_id text not null,
  transform_version text not null,
  generated_at timestamptz not null,
  imported_at timestamptz not null default now(),
  unique (year, week, kcal, base_persons)
);

create index if not exists menufit_gold_week_plans_year_week_idx
  on public.menufit_gold_week_plans (year, week, kcal, base_persons);

create table if not exists public.menufit_gold_recipes (
  recipe_id text primary key,
  slug text,
  name text not null,
  image_url text,
  kcal integer,
  intro text,
  ingredients_relates_to text,
  nutrients_relates_to text,
  imported_at timestamptz,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists menufit_gold_recipes_slug_idx
  on public.menufit_gold_recipes (slug);

create table if not exists public.menufit_gold_recipe_tags (
  recipe_id text not null references public.menufit_gold_recipes (recipe_id) on delete cascade,
  tag text not null,
  primary key (recipe_id, tag)
);

create table if not exists public.menufit_gold_recipe_prep_times (
  recipe_id text not null references public.menufit_gold_recipes (recipe_id) on delete cascade,
  ordinal integer not null,
  label text not null,
  amount numeric,
  unit text,
  primary key (recipe_id, ordinal)
);

create table if not exists public.menufit_gold_recipe_ingredients (
  recipe_id text not null references public.menufit_gold_recipes (recipe_id) on delete cascade,
  ordinal integer not null,
  ingredient_text text not null,
  primary key (recipe_id, ordinal)
);

create table if not exists public.menufit_gold_recipe_steps (
  recipe_id text not null references public.menufit_gold_recipes (recipe_id) on delete cascade,
  step_number integer not null,
  step_text text not null,
  primary key (recipe_id, step_number)
);

create table if not exists public.menufit_gold_recipe_tips (
  recipe_id text not null references public.menufit_gold_recipes (recipe_id) on delete cascade,
  ordinal integer not null,
  tip_text text not null,
  primary key (recipe_id, ordinal)
);

create table if not exists public.menufit_gold_recipe_nutrition (
  recipe_id text not null references public.menufit_gold_recipes (recipe_id) on delete cascade,
  code text not null,
  label text not null,
  amount numeric,
  unit text,
  primary key (recipe_id, code)
);

create table if not exists public.menufit_gold_linked_day_menus (
  recipe_id text not null references public.menufit_gold_recipes (recipe_id) on delete cascade,
  day_menu_id text not null,
  slug text not null,
  title text not null,
  image_url text,
  kcal_variants integer[] not null default '{}',
  primary key (recipe_id, day_menu_id)
);

create table if not exists public.menufit_gold_meals (
  meal_id text primary key,
  week_plan_id text not null references public.menufit_gold_week_plans (week_plan_id) on delete cascade,
  recipe_id text references public.menufit_gold_recipes (recipe_id) on delete set null,
  day_label text not null,
  meal_label text not null,
  recipe_name text,
  image_url text,
  kcal integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists menufit_gold_meals_week_plan_idx
  on public.menufit_gold_meals (week_plan_id, day_label, sort_order);

create table if not exists public.menufit_gold_groceries (
  week_plan_id text not null references public.menufit_gold_week_plans (week_plan_id) on delete cascade,
  canonical_name text not null,
  total_amount numeric,
  unit text,
  requires_review boolean not null default false,
  primary key (week_plan_id, canonical_name)
);

create table if not exists public.menufit_gold_grocery_reconcile (
  week_plan_id text not null references public.menufit_gold_week_plans (week_plan_id) on delete cascade,
  canonical_name text not null,
  reconcile_status text not null,
  note text,
  primary key (week_plan_id, canonical_name)
);

create table if not exists public.menufit_gold_cart_plans (
  cart_plan_id text primary key,
  week_plan_id text not null references public.menufit_gold_week_plans (week_plan_id) on delete cascade,
  item_count integer not null,
  unresolved_count integer not null,
  generated_at timestamptz not null
);

create table if not exists public.menufit_weight_logs (
  weight_log_id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  measured_on date not null,
  weight_kg numeric(6,2) not null,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, measured_on)
);

create index if not exists menufit_weight_logs_user_date_idx
  on public.menufit_weight_logs (user_id, measured_on desc);

create table if not exists public.menufit_recipe_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id text not null references public.menufit_gold_recipes (recipe_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create table if not exists public.menufit_import_runs (
  import_run_id text primary key,
  source text not null,
  mode text not null check (mode in ('full', 'delta', 'backfill')),
  status text not null check (status in ('planned', 'running', 'completed', 'failed')),
  started_at timestamptz not null,
  finished_at timestamptz,
  actor_user_id uuid references auth.users (id) on delete set null,
  details jsonb not null default '{}'::jsonb
);

create table if not exists public.menufit_import_errors (
  import_error_id bigint generated by default as identity primary key,
  import_run_id text not null references public.menufit_import_runs (import_run_id) on delete cascade,
  stage text not null,
  entity_type text not null,
  entity_ref text,
  message text not null,
  created_at timestamptz not null default now()
);
