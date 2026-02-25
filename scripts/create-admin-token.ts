/**
 * Genereer een dev admin token voor lokale ontwikkeling.
 *
 * Gebruik:  node --experimental-strip-types scripts/create-admin-token.ts
 *
 * Schrijft het token naar stdout EN naar out/dev-admin-token.txt.
 * De server (src/backend/server.ts) laadt bestaande sessies via PersistentStateStore,
 * zodat het gegenereerde token meteen geldig is als de server dezelfde state file gebruikt.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { SessionLifecycleService } from "../src/backend/application/auth/session-lifecycle-service.ts";
import { PersistentStateStore } from "../src/backend/integrations/storage/persistent-state-store.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const STATE_PATH = process.env["STATE_STORE_PATH"] ?? join(ROOT, "out", "v3", "state", "server-state.json");
const TOKEN_PATH = join(ROOT, "out", "dev-admin-token.txt");

const OPERATOR_ID = process.argv[2] ?? process.env["DEV_OPERATOR_ID"] ?? "dev-admin";
const ROLE = (process.argv[3] ?? "owner") as "operator" | "owner";
const TTL_HOURS = Number(process.argv[4] ?? 24);

const stateStore = new PersistentStateStore(STATE_PATH);
const lifecycle = new SessionLifecycleService({
  stateStore,
  adminTtlSeconds: TTL_HOURS * 60 * 60,
});

const { token, session } = lifecycle.issueAdminSession({
  subjectId: OPERATOR_ID,
  adminRole: ROLE,
  ttlSeconds: TTL_HOURS * 60 * 60,
});

await mkdir(join(ROOT, "out"), { recursive: true });
await writeFile(TOKEN_PATH, token, "utf8");

const expiresAt = new Date(session.expiresAtEpochSeconds * 1000).toLocaleString("nl-NL");

console.log("");
console.log("✅  Dev admin token aangemaakt");
console.log("─".repeat(70));
console.log(`  Operator:   ${OPERATOR_ID}`);
console.log(`  Rol:        ${ROLE}`);
console.log(`  Verloopt:   ${expiresAt}`);
console.log("");
console.log("  TOKEN:");
console.log(`  ${token}`);
console.log("");
console.log(`  Opgeslagen in: out/dev-admin-token.txt`);
console.log("─".repeat(70));
console.log("");
console.log("  Gebruik in de admin UI (http://localhost:5173):");
console.log(`  - Backend URL:  http://localhost:3000`);
console.log(`  - Operator ID:  ${OPERATOR_ID}`);
console.log(`  - Token:        (zie hierboven)`);
console.log("");
