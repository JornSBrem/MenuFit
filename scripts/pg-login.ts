/**
 * Log in bij Project Gezond en sla de sessie-cookie op.
 *
 * Gebruik:
 *   node --experimental-strip-types scripts/pg-login.ts <email> <password>
 *
 * Of met environment variables:
 *   PG_EMAIL=... PG_PASSWORD=... node --experimental-strip-types scripts/pg-login.ts
 *
 * Na succesvol inloggen:
 *   - Schrijft de cookie naar out/pg-session.json
 *   - Print de waarde die je in de admin UI kunt invullen bij PG_EXTRA_HEADERS_JSON
 *
 * De server laadt PG_EXTRA_HEADERS_JSON bij elke ingest — update de config
 * via de admin UI of via het /api/v3/admin/config endpoint als de server draait.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { loginToPg, PgLoginError } from "../src/backend/integrations/pg/pg-login.ts";
import { createDefaultRuntimeConfig } from "../src/shared/config/index.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SESSION_PATH = join(ROOT, "out", "pg-session.json");

const email = process.argv[2] ?? process.env["PG_EMAIL"] ?? "";
const password = process.argv[3] ?? process.env["PG_PASSWORD"] ?? "";

if (!email || !password) {
  console.error(
    "❌  Gebruik: node --experimental-strip-types scripts/pg-login.ts <email> <password>\n" +
      "   Of:      PG_EMAIL=... PG_PASSWORD=... node --experimental-strip-types scripts/pg-login.ts",
  );
  process.exit(1);
}

const config = createDefaultRuntimeConfig();
const loginUrl = config.get<string>("PG_LOGIN_URL");

console.log(`\n🔐  Inloggen bij Project Gezond (${loginUrl})...`);

try {
  const result = await loginToPg({ email, password }, loginUrl);

  const sessionData = {
    email,
    loginUrl,
    extraHeaders: result.extraHeaders,
    cookieNames: result.cookieNames,
    savedAt: new Date().toISOString(),
  };

  await mkdir(join(ROOT, "out"), { recursive: true });
  await writeFile(SESSION_PATH, JSON.stringify(sessionData, null, 2), "utf8");

  console.log("\n✅  Ingelogd bij Project Gezond");
  console.log("─".repeat(70));
  console.log(`  Cookies:     ${result.cookieNames.join(", ")}`);
  console.log(`  Opgeslagen:  out/pg-session.json`);
  console.log("─".repeat(70));
  console.log("\n  Zet dit in de admin UI bij PG_EXTRA_HEADERS_JSON:");
  console.log("");
  console.log("  " + JSON.stringify(result.extraHeaders));
  console.log("");
  console.log(
    "  Of als de server al draait, update via curl:\n" +
    `  curl -X POST http://localhost:3000/api/v3/admin/config \\\n` +
    `    -H "Authorization: Bearer <admin-token>" \\\n` +
    `    -H "Content-Type: application/json" \\\n` +
    `    -d '{"operationId":"pg-auth","key":"PG_EXTRA_HEADERS_JSON","value":${JSON.stringify(JSON.stringify(result.extraHeaders))}}'\n`,
  );
  console.log("─".repeat(70));
  console.log("\n  Daarna kan je ingest starten via de admin UI (Extract tab).\n");
} catch (err) {
  if (err instanceof PgLoginError) {
    console.error(`\n❌  ${err.message} (code: ${err.code})\n`);
  } else {
    console.error(`\n❌  Onverwachte fout: ${err instanceof Error ? err.message : String(err)}\n`);
  }
  process.exit(1);
}
