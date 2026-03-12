/**
 * Test-script: probeer welke PG API week-URL formats werken.
 * Gebruik: node --experimental-strip-types scripts/test-pg-url-formats.ts
 * Of met env vars: PG_EMAIL=x PG_PASSWORD=y node --experimental-strip-types scripts/test-pg-url-formats.ts
 */

const PG_BASE = process.env.PG_BASE ?? "https://backend.projectgezond.nl";
const LOGIN_PATH = process.env.PG_LOGIN_PATH ?? "/api/login";
const LOGIN_URL = `${PG_BASE}${LOGIN_PATH}`;

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
const WEEK_YYYYWW = Number(process.env.PG_WEEK_YYYYWW ?? "202609");
const WEEK_ONLY = Number(process.env.PG_WEEK_ONLY ?? "9");

const urlsToTest: Array<{ label: string; url: string }> = [
  { label: "Nieuw week-menu weeknr",         url: `${PG_BASE}/api/week-menu/${WEEK_ONLY}` },
  { label: "Nieuw week-menu YYYYWW",         url: `${PG_BASE}/api/week-menu/${WEEK_YYYYWW}` },
  { label: "Nieuw week-menu lijst",          url: `${PG_BASE}/api/week-menu` },
  { label: "Legacy v3 week weeknr",          url: `${PG_BASE}/api/v3/week-menus/${WEEK_ONLY}` },
  { label: "Legacy v3 week YYYYWW",          url: `${PG_BASE}/api/v3/week-menus/${WEEK_YYYYWW}` },
  { label: "Nieuw recipe slug",              url: `${PG_BASE}/api/recipe/butterchicken-met-rijst` },
  { label: "Legacy recipe slug",             url: `${PG_BASE}/api/v3/recipes/butterchicken-met-rijst` },
  { label: "Dashboard",                      url: `${PG_BASE}/api/dashboard` },
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
