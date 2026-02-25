/**
 * Update iOS Info.plist met de dev user token en backend URL.
 *
 * Gebruik:  node --experimental-strip-types scripts/update-ios-plist.ts
 *
 * Leest het user token uit out/dev-user-token.txt (aangemaakt door de server
 * of door scripts/create-user-token.ts) en schrijft het naar
 * src/ios-user-app/App/Info.plist.
 *
 * Werkt ook met een token als argument:
 *   node --experimental-strip-types scripts/update-ios-plist.ts <token>
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TOKEN_PATH = join(ROOT, "out", "dev-user-token.txt");
const PLIST_PATH = join(ROOT, "src", "ios-user-app", "App", "Info.plist");
const BACKEND_URL = process.env["MENUFIT_BACKEND_URL"] ?? "http://localhost:3000";

// Read token from argument or file
let token = process.argv[2]?.trim() ?? "";
if (!token) {
  try {
    token = (await readFile(TOKEN_PATH, "utf8")).trim();
  } catch {
    console.error(
      `❌  Kan ${TOKEN_PATH} niet lezen.\n` +
        `   Start de server eerst:  node --experimental-strip-types src/backend/server.ts\n` +
        `   Of genereer een token:  node --experimental-strip-types scripts/create-user-token.ts`,
    );
    process.exit(1);
  }
}

if (!token) {
  console.error("❌  Leeg token — start de server of geef het token als argument mee.");
  process.exit(1);
}

// Parse expiry from token: user:<subjectId>:<tokenId>:<picnicAccountId>:<expiresAtEpochSeconds>
const segments = token.split(":");
const expiresAtEpochSeconds = segments.length === 5 ? Number(segments[4]) : 0;
if (!Number.isInteger(expiresAtEpochSeconds) || expiresAtEpochSeconds <= 0) {
  console.error(`❌  Ongeldig token formaat: ${token.slice(0, 40)}...`);
  process.exit(1);
}

const subjectId = segments[1] ?? "ios-user";
const picnicAccountId = segments[3] ?? "picnic-default";
const expiresAt = new Date(expiresAtEpochSeconds * 1000).toLocaleString("nl-NL");

// Read and update Info.plist
const plist = await readFile(PLIST_PATH, "utf8");

const updated = plist
  .replace(
    /(<key>MenuFitBackendBaseURL<\/key>\s*<string>)[^<]*(<\/string>)/,
    `$1${BACKEND_URL}$2`,
  )
  .replace(
    /(<key>MenuFitUserAccessToken<\/key>\s*<string>)[^<]*(<\/string>)/,
    `$1${token}$2`,
  )
  .replace(
    /(<key>MenuFitUserSubjectId<\/key>\s*<string>)[^<]*(<\/string>)/,
    `$1${subjectId}$2`,
  )
  .replace(
    /(<key>MenuFitPicnicAccountId<\/key>\s*<string>)[^<]*(<\/string>)/,
    `$1${picnicAccountId}$2`,
  )
  .replace(
    /(<key>MenuFitUserTokenExpiryEpochSeconds<\/key>\s*<integer>)[^<]*(<\/integer>)/,
    `$1${expiresAtEpochSeconds}$2`,
  );

await writeFile(PLIST_PATH, updated, "utf8");

console.log("");
console.log("✅  iOS Info.plist bijgewerkt");
console.log("─".repeat(70));
console.log(`  Backend URL:  ${BACKEND_URL}`);
console.log(`  Subject ID:   ${subjectId}`);
console.log(`  Picnic ID:    ${picnicAccountId}`);
console.log(`  Token:        ${token.slice(0, 50)}...`);
console.log(`  Verloopt:     ${expiresAt}`);
console.log("─".repeat(70));
console.log("");
console.log("  Volgende stap: build de iOS app in Xcode en run in de simulator.");
console.log("");
