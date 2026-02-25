/**
 * Genereer een dev user token voor de iOS app.
 *
 * Gebruik:  node --experimental-strip-types scripts/create-user-token.ts
 *
 * Schrijft het token naar stdout EN naar out/dev-user-token.txt.
 * De server (src/backend/server.ts) laadt bestaande sessies via PersistentStateStore,
 * zodat het gegenereerde token meteen geldig is als de server dezelfde state file gebruikt.
 *
 * Opties:
 *   node --experimental-strip-types scripts/create-user-token.ts [subjectId] [picnicAccountId] [ttlHours]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { SessionLifecycleService } from "../src/backend/application/auth/session-lifecycle-service.ts";
import { PersistentStateStore } from "../src/backend/integrations/storage/persistent-state-store.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const STATE_PATH =
  process.env["STATE_STORE_PATH"] ?? join(ROOT, "out", "v3", "state", "server-state.json");
const TOKEN_PATH = join(ROOT, "out", "dev-user-token.txt");

const SUBJECT_ID = process.argv[2] ?? process.env["DEV_USER_ID"] ?? "ios-user";
const PICNIC_ACCOUNT_ID = process.argv[3] ?? process.env["DEV_PICNIC_ACCOUNT_ID"] ?? "picnic-default";
const TTL_HOURS = Number(process.argv[4] ?? 720); // 30 days default

const stateStore = new PersistentStateStore(STATE_PATH);
const lifecycle = new SessionLifecycleService({
  stateStore,
  userTtlSeconds: TTL_HOURS * 60 * 60,
});

const { token, session } = lifecycle.issueUserSession({
  subjectId: SUBJECT_ID,
  picnicAccountId: PICNIC_ACCOUNT_ID,
  ttlSeconds: TTL_HOURS * 60 * 60,
});

await mkdir(join(ROOT, "out"), { recursive: true });
await writeFile(TOKEN_PATH, token, "utf8");

const expiresAt = new Date(session.expiresAtEpochSeconds * 1000).toLocaleString("nl-NL");

console.log("");
console.log("✅  Dev user token aangemaakt");
console.log("─".repeat(70));
console.log(`  Subject ID:      ${SUBJECT_ID}`);
console.log(`  Picnic Account:  ${PICNIC_ACCOUNT_ID}`);
console.log(`  Verloopt:        ${expiresAt}`);
console.log("");
console.log("  TOKEN:");
console.log(`  ${token}`);
console.log("");
console.log(`  Opgeslagen in: out/dev-user-token.txt`);
console.log("─".repeat(70));
console.log("");
console.log("  Update de iOS app Info.plist:");
console.log(
  "  node --experimental-strip-types scripts/update-ios-plist.ts",
);
console.log("");
