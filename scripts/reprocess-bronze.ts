/**
 * Herverwerk alle bestaande bronze weekmenu-bestanden naar silver + gold.
 *
 * Gebruik: node --experimental-strip-types scripts/reprocess-bronze.ts
 *
 * Dit script leest bestaande bronze-bestanden en verwerkt ze opnieuw door
 * de volledige silver/gold pipeline, zonder nieuwe data van de PG API te
 * hoeven ophalen. Handig na een bugfix in de mapper of transformer.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { PersistentStateStore } from "../src/backend/integrations/storage/persistent-state-store.ts";
import { SessionLifecycleService } from "../src/backend/application/auth/session-lifecycle-service.ts";
import { reprocessSilverTransforms } from "../src/backend/application/silver/index.ts";
import { GoldWeekReadService, projectSilverToGold } from "../src/backend/application/gold/index.ts";
import { mapPgWeekDataToSilverPayload } from "../src/backend/application/ingest/pg-payload-mapper.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const STATE_PATH = join(ROOT, "out", "v3", "state", "server-state.json");
const BRONZE_ROOT = join(ROOT, "out", "v3", "bronze");
const TRANSFORM_VERSION = "1.0.0";
const CANONICAL_RULESET_VERSION = "1.0.0";
const SYNONYM_DICT_VERSION = "1.0.0";
const PG_FIXED_KCALS = [1250, 1500, 1800, 2100];

// ---- Hulpfuncties ----------------------------------------------------------

/** Recursief alle bestanden ophalen in een map */
function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const result: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      result.push(...walk(full));
    } else {
      result.push(full);
    }
  }
  return result;
}

// ---- Hoofdlogica -----------------------------------------------------------

const stateStore = new PersistentStateStore(STATE_PATH);
const lifecycle = new SessionLifecycleService({ stateStore });
const goldReadService = new GoldWeekReadService({ stateStore });

// Zoek alle pg.week_menu bronze bestanden
const allFiles = walk(BRONZE_ROOT);
const weekMenuFiles = allFiles.filter(
  (f) => f.includes("pg.week_menu") && f.endsWith(".json"),
);

console.log(`Gevonden: ${weekMenuFiles.length} bronze weekmenu-bestanden`);

let processed = 0;
let errors = 0;
let totalMeals = 0;

for (const filePath of weekMenuFiles) {
  try {
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as {
      metadata: {
        year: number;
        week: number;
        basePersons: number;
        requestMeta?: { requestUrl?: string };
      };
      payload: unknown;
    };

    const meta = raw.metadata;
    const weekNum = meta.week % 100; // YYYYWW → WW
    const weekYear = Math.floor(meta.week / 100); // YYYYWW → YYYY
    const basePersons = meta.basePersons ?? 2;
    const sourceObjectId = meta.requestMeta?.requestUrl ?? filePath;

    // Haal het data-object op uit de bronze payload
    const payloadObj = raw.payload as Record<string, unknown>;
    const pgData = payloadObj["data"] ?? raw.payload;

    for (const kcal of PG_FIXED_KCALS) {
      const silverPayload = mapPgWeekDataToSilverPayload(pgData, kcal);

      const silverOutputs = reprocessSilverTransforms(
        [
          {
            sourceObjectId,
            payload: silverPayload,
            year: weekYear,
            week: weekNum,
            kcal,
            basePersons,
          },
        ],
        {
          transformVersion: TRANSFORM_VERSION,
          canonicalRulesetVersion: CANONICAL_RULESET_VERSION,
          synonymDictVersion: SYNONYM_DICT_VERSION,
          stateStore,
        },
      );

      for (const silver of silverOutputs) {
        const gold = projectSilverToGold({
          silver,
          context: {
            sourceObjectId,
            year: weekYear,
            week: weekNum,
            kcal,
            basePersons,
            transformVersion: TRANSFORM_VERSION,
            canonicalRulesetVersion: CANONICAL_RULESET_VERSION,
            synonymDictVersion: SYNONYM_DICT_VERSION,
          },
        });
        goldReadService.upsert(gold);
        totalMeals += silver.meals.length;
      }
    }

    processed++;
    const rel = relative(BRONZE_ROOT, filePath);
    console.log(
      `  ✓ ${rel} → week ${weekYear}W${String(weekNum).padStart(2, "0")}, jaar ${weekYear}`,
    );
  } catch (err) {
    errors++;
    console.error(`  ✗ ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log("");
console.log(`Klaar! Verwerkt: ${processed} bestanden, fouten: ${errors}, totale maaltijdrijen: ${totalMeals}`);

void lifecycle;
