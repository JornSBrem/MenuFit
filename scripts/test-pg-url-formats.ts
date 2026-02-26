/**
 * Test-script: probeer welke PG API week-URL formats werken.
 * Gebruik: node --experimental-strip-types scripts/test-pg-url-formats.ts
 * Of met env vars: PG_EMAIL=x PG_PASSWORD=y node --experimental-strip-types scripts/test-pg-url-formats.ts
 */

const PG_BASE = "https://backend.projectgezond.nl";
const LOGIN_URL = `${PG_BASE}/api/login`;

const email = process.env.PG_EMAIL ?? "";
const password = process.env.PG_PASSWORD ?? "";

if (!email || !password) {
  console.error("Gebruik: PG_EMAIL=... PG_PASSWORD=... node --experimental-strip-types scripts/test-pg-url-formats.ts");
  process.exit(1);
}

// Login
console.log("Inloggen bij PG API...");
const loginRes = await fetch(LOGIN_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
  body: JSON.stringify({ email, password }),
});
const loginBody = await loginRes.json() as Record<string, unknown>;
const token = (loginBody["accesToken"] ?? loginBody["accessToken"] ?? loginBody["token"]) as string | undefined;
if (!token) {
  console.error("Login mislukt. Body:", JSON.stringify(loginBody).slice(0, 200));
  process.exit(1);
}
console.log("✅ Ingelogd. Token (eerste 30 tekens):", token.slice(0, 30));

const headers: Record<string, string> = {
  Accept: "application/json",
  "X-Requested-With": "XMLHttpRequest",
  Authorization: `Bearer ${token}`,
};

// Week-varianten om te testen
const WEEK_YYYYWW = 202609;      // week 9 van 2026 (huidige week)
const WEEK_ONLY = 9;             // enkel weeknummer
const YEAR = 2026;

const urlsToTest: Array<{ label: string; url: string }> = [
  // Huidige formaat
  { label: "YYYYWW pad",                     url: `${PG_BASE}/api/v3/week-menus/${WEEK_YYYYWW}` },
  // Alleen weeknummer
  { label: "Alleen weeknr pad",              url: `${PG_BASE}/api/v3/week-menus/${WEEK_ONLY}` },
  // Met jaar/week split
  { label: "jaar/week pad",                  url: `${PG_BASE}/api/v3/week-menus/${YEAR}/${WEEK_ONLY}` },
  // Query param varianten
  { label: "?week=YYYYWW query",             url: `${PG_BASE}/api/v3/week-menus?week=${WEEK_YYYYWW}` },
  { label: "?week=weeknr query",             url: `${PG_BASE}/api/v3/week-menus?week=${WEEK_ONLY}` },
  // Met kcal
  { label: "YYYYWW + ?kcal=2000",            url: `${PG_BASE}/api/v3/week-menus/${WEEK_YYYYWW}?kcal=2000` },
  { label: "YYYYWW + ?kcal=2000&persons=2",  url: `${PG_BASE}/api/v3/week-menus/${WEEK_YYYYWW}?kcal=2000&base_persons=2` },
  // v2 API
  { label: "v2 YYYYWW",                      url: `${PG_BASE}/api/v2/week-menus/${WEEK_YYYYWW}` },
  { label: "v2 weeknr",                      url: `${PG_BASE}/api/v2/week-menus/${WEEK_ONLY}` },
  // Basis endpoint zonder week
  { label: "Basis week-menus lijst",         url: `${PG_BASE}/api/v3/week-menus` },
];

console.log("\nURL-formaten testen...\n");
for (const { label, url } of urlsToTest) {
  try {
    const res = await fetch(url, { method: "GET", headers });
    const contentType = res.headers.get("content-type") ?? "";
    let bodyPreview = "";
    if (res.ok && contentType.includes("json")) {
      const body = await res.json() as Record<string, unknown>;
      const keys = typeof body === "object" && body ? Object.keys(body) : [];
      bodyPreview = `sleutels: [${keys.slice(0, 5).join(", ")}]`;
    } else if (!res.ok) {
      try {
        const errBody = await res.text();
        bodyPreview = errBody.slice(0, 80);
      } catch { /* */ }
    }
    const status = res.ok ? `✅ ${res.status}` : `❌ ${res.status}`;
    console.log(`${status}  ${label}`);
    console.log(`       ${url}`);
    if (bodyPreview) console.log(`       ${bodyPreview}`);
    console.log();
  } catch (err) {
    console.log(`💥 FOUT  ${label}: ${err instanceof Error ? err.message : String(err)}`);
    console.log();
  }
}
