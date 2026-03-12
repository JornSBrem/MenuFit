/**
 * Bouw een volledige SQL backfill voor het Supabase gold schema vanuit de
 * huidige lokale MenuFit state store. Kan de SQL naar stdout of een bestand
 * schrijven, en optioneel direct uitvoeren via psql.
 *
 * Gebruik:
 *   node --experimental-strip-types scripts/backfill-supabase-gold.ts
 *   node --experimental-strip-types scripts/backfill-supabase-gold.ts --output out/supabase-gold-backfill.sql
 *   SUPABASE_GOLD_DATABASE_URL=postgres://... node --experimental-strip-types scripts/backfill-supabase-gold.ts --execute
 */
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { createDefaultRuntimeConfig } from "../src/shared/config/index.ts";
import { createPersistentStateStore } from "../src/backend/application/config/create-persistent-state-store.ts";
import { buildSupabaseGoldBackfillSql } from "../src/backend/application/gold/supabase-backfill.ts";

const args = process.argv.slice(2);
const outputFlagIndex = args.indexOf("--output");
const outputPath = outputFlagIndex >= 0 ? args[outputFlagIndex + 1] : undefined;
const shouldExecute = args.includes("--execute");

const config = createDefaultRuntimeConfig(
  Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined)) as Record<string, string>,
);
const stateStore = createPersistentStateStore(config);
const state = stateStore.read();
const importRunId = `backfill-${randomUUID()}`;
const sql = buildSupabaseGoldBackfillSql(state, {
  importRunId,
  actorUserId: process.env["SUPABASE_BACKFILL_ACTOR_USER_ID"],
});

if (outputPath) {
  const absoluteOutputPath = resolve(process.cwd(), outputPath);
  mkdirSync(dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, sql, "utf8");
  console.log(`SQL backfill geschreven naar ${absoluteOutputPath}`);
}

if (shouldExecute) {
  const connectionString = process.env["SUPABASE_GOLD_DATABASE_URL"]?.trim();
  if (!connectionString) {
    throw new Error("SUPABASE_GOLD_DATABASE_URL is required with --execute.");
  }
  const result = spawnSync("psql", [connectionString, "-v", "ON_ERROR_STOP=1"], {
    input: sql,
    stdio: ["pipe", "inherit", "inherit"],
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`psql execution failed with status ${result.status ?? "unknown"}.`);
  }
  console.log(`Supabase gold backfill uitgevoerd. import_run_id=${importRunId}`);
} else if (!outputPath) {
  process.stdout.write(sql);
}
