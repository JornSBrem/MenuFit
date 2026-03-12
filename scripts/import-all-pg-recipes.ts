/**
 * Importeert alle recepten uit out/pg-recipe-slugs.json via de draaiende server.
 *
 * Gebruik:
 *   1. Draai eerst: node --experimental-strip-types scripts/discover-pg-recipes.ts
 *   2. Zorg dat de server draait (node --experimental-strip-types src/backend/server.ts)
 *   3. Draai: node --experimental-strip-types scripts/import-all-pg-recipes.ts
 *
 * Omgevingsvariabelen:
 *   MENUFIT_URL   - Server URL (default: http://localhost:3000)
 *   ADMIN_TOKEN   - Admin Bearer token (zoekt anders in out/dev-admin-token.txt)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SLUGS_PATH = join(ROOT, "out", "pg-recipe-slugs.json");

const baseUrl = process.env["MENUFIT_URL"] ?? "http://localhost:3000";

let adminToken = process.env["ADMIN_TOKEN"] ?? "";
if (!adminToken) {
  try {
    adminToken = readFileSync(join(ROOT, "out", "dev-admin-token.txt"), "utf8").trim();
  } catch {
    console.error("❌  Geen admin token gevonden. Zet ADMIN_TOKEN of draai de server (token staat in out/dev-admin-token.txt)");
    process.exit(1);
  }
}

// Lees slugs
let slugs: string[];
try {
  const data = JSON.parse(readFileSync(SLUGS_PATH, "utf8"));
  slugs = data.slugs;
  console.log(`📋  ${slugs.length} slugs geladen uit ${SLUGS_PATH}`);
} catch {
  console.error(`❌  Kan ${SLUGS_PATH} niet lezen. Draai eerst discover-pg-recipes.ts`);
  process.exit(1);
}

// Importeer in batches van 100 (om timeout te voorkomen)
const BATCH_SIZE = 100;
let totalImported = 0;
let totalSkipped = 0;
let totalErrors = 0;
const allErrors: string[] = [];

const startTime = Date.now();

for (let i = 0; i < slugs.length; i += BATCH_SIZE) {
  const batch = slugs.slice(i, i + BATCH_SIZE);
  const batchNum = Math.floor(i / BATCH_SIZE) + 1;
  const totalBatches = Math.ceil(slugs.length / BATCH_SIZE);

  console.log(`\n🔄  Batch ${batchNum}/${totalBatches} (${batch.length} slugs)...`);

  try {
    const res = await fetch(`${baseUrl}/api/v3/admin/import-recipe-slugs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ slugs: batch, skipExisting: true }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`  ❌ HTTP ${res.status}: ${text.slice(0, 200)}`);
      totalErrors += batch.length;
      continue;
    }

    const result = (await res.json()) as {
      ok: boolean;
      data?: { totalSlugs: number; skipped: number; fetched: number; imported: number; errors: string[] };
    };

    if (result.ok && result.data) {
      totalImported += result.data.imported;
      totalSkipped += result.data.skipped;
      totalErrors += result.data.errors.length;
      if (result.data.errors.length > 0) {
        allErrors.push(...result.data.errors);
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(
        `  ✅ geïmporteerd: ${result.data.imported}, overgeslagen: ${result.data.skipped}, fouten: ${result.data.errors.length} (${elapsed}s)`,
      );
    }
  } catch (err) {
    console.error(`  💥 ${err instanceof Error ? err.message : String(err)}`);
    totalErrors += batch.length;
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
console.log(`\n${"─".repeat(70)}`);
console.log(`Klaar in ${elapsed}s`);
console.log(`  Geïmporteerd: ${totalImported}`);
console.log(`  Overgeslagen:  ${totalSkipped} (bestonden al)`);
console.log(`  Fouten:        ${totalErrors}`);
if (allErrors.length > 0) {
  console.log(`\nEerste 20 fouten:`);
  for (const err of allErrors.slice(0, 20)) {
    console.log(`  - ${err}`);
  }
}
