/**
 * Vergelijkt kern-aantallen tussen de huidige lokale MenuFit gold-state en de
 * Supabase gold-tabellen. Gebruik na backfill of dual-write-validatie.
 *
 * Gebruik:
 *   SUPABASE_GOLD_DATABASE_URL='postgres://...' \
 *   node --experimental-strip-types scripts/check-supabase-gold-parity.ts
 */
import { spawnSync } from "node:child_process";

import { createDefaultRuntimeConfig } from "../src/shared/config/index.ts";
import { createPersistentStateStore } from "../src/backend/application/config/create-persistent-state-store.ts";

const connectionString = process.env["SUPABASE_GOLD_DATABASE_URL"]?.trim();
if (!connectionString) {
  throw new Error("SUPABASE_GOLD_DATABASE_URL is required.");
}

const config = createDefaultRuntimeConfig(
  Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined)) as Record<string, string>,
);
const stateStore = createPersistentStateStore(config);
const state = stateStore.read();

const localCounts = {
  weekPlans: Object.keys(state.goldReadModels).length,
  recipes: Object.keys(state.recipeCatalog).length,
  meals: Object.values(state.goldReadModels).reduce((sum, model) => sum + model.meals.length, 0),
  groceries: Object.values(state.goldReadModels).reduce((sum, model) => sum + model.groceries.length, 0),
  reconcile: Object.values(state.goldReadModels).reduce((sum, model) => sum + model.groceryReconcile.length, 0),
  cartPlans: Object.values(state.goldReadModels).length,
};

const sql = `copy (
select
  (select count(*) from public.menufit_gold_week_plans) as week_plans,
  (select count(*) from public.menufit_gold_recipes) as recipes,
  (select count(*) from public.menufit_gold_meals) as meals,
  (select count(*) from public.menufit_gold_groceries) as groceries,
  (select count(*) from public.menufit_gold_grocery_reconcile) as reconcile,
  (select count(*) from public.menufit_gold_cart_plans) as cart_plans
) to stdout with csv header;`;

const result = spawnSync("psql", [connectionString, "-v", "ON_ERROR_STOP=1", "-c", sql], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});
if (result.status !== 0) {
  throw new Error(`psql parity query failed with status ${result.status ?? "unknown"}.`);
}

const lines = result.stdout.trim().split(/\r?\n/);
if (lines.length < 2) {
  throw new Error("Parity query returned no data.");
}
const headers = lines[0]!.split(",");
const values = lines[1]!.split(",");
const remoteRecord = Object.fromEntries(headers.map((header, index) => [header, Number(values[index] ?? 0)]));
const remoteCounts = {
  weekPlans: remoteRecord["week_plans"] ?? 0,
  recipes: remoteRecord["recipes"] ?? 0,
  meals: remoteRecord["meals"] ?? 0,
  groceries: remoteRecord["groceries"] ?? 0,
  reconcile: remoteRecord["reconcile"] ?? 0,
  cartPlans: remoteRecord["cart_plans"] ?? 0,
};

const mismatches = Object.entries(localCounts)
  .filter(([key, value]) => value !== remoteCounts[key as keyof typeof remoteCounts])
  .map(([key, value]) => ({ key, local: value, remote: remoteCounts[key as keyof typeof remoteCounts] }));

console.log(JSON.stringify({ localCounts, remoteCounts, mismatches }, null, 2));

if (mismatches.length > 0) {
  process.exitCode = 1;
}
