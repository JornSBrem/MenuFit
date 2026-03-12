/**
 * Ontdek alle recept-slugs op projectgezond.nl.
 *
 * Probeert meerdere strategieën:
 *   1. PG API receptenlijst-endpoints (paginated)
 *   2. Sitemap.xml
 *   3. Website /recepten pagina scraping
 *
 * Gebruik:
 *   PG_EMAIL=... PG_PASSWORD=... node --experimental-strip-types scripts/discover-pg-recipes.ts
 *
 * Output: schrijft alle gevonden slugs naar out/pg-recipe-slugs.json
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { loginToPg } from "../src/backend/integrations/pg/pg-login.ts";
import { createDefaultRuntimeConfig } from "../src/shared/config/index.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUTPUT_PATH = join(ROOT, "out", "pg-recipe-slugs.json");

const PG_BASE = "https://backend.projectgezond.nl";
const PG_FRONTEND = "https://projectgezond.nl";

const email = process.argv[2] ?? process.env["PG_EMAIL"] ?? "";
const password = process.argv[3] ?? process.env["PG_PASSWORD"] ?? "";

if (!email || !password) {
  console.error(
    "Gebruik: PG_EMAIL=... PG_PASSWORD=... node --experimental-strip-types scripts/discover-pg-recipes.ts",
  );
  process.exit(1);
}

// ---- Login ----
const config = createDefaultRuntimeConfig();
const loginUrl = config.get<string>("PG_LOGIN_URL");
console.log(`🔐  Inloggen bij PG (${loginUrl})...`);
const loginResult = await loginToPg({ email, password }, loginUrl);
const headers: Record<string, string> = {
  Accept: "application/json",
  "X-Requested-With": "XMLHttpRequest",
  ...loginResult.extraHeaders,
};
console.log("✅  Ingelogd\n");

const allSlugs = new Set<string>();

// ---- Strategie 1: API receptlijst endpoints ----
async function tryApiListing(): Promise<boolean> {
  const endpoints = [
    `${PG_BASE}/api/recipes`,
    `${PG_BASE}/api/v3/recipes`,
    `${PG_BASE}/api/recipe`,
    `${PG_BASE}/api/v3/recipe`,
    `${PG_BASE}/api/recipes/all`,
    `${PG_BASE}/api/search?type=recipe&per_page=100`,
  ];

  for (const url of endpoints) {
    try {
      console.log(`  Probeer: ${url}`);
      const res = await fetch(url, { method: "GET", headers });
      if (!res.ok) {
        console.log(`    ❌ ${res.status}`);
        continue;
      }
      const body = await res.json() as Record<string, unknown>;
      const keys = Object.keys(body);
      console.log(`    ✅ ${res.status} — sleutels: [${keys.slice(0, 8).join(", ")}]`);

      // Probeer recipes te extraheren uit response
      const candidates = [body.data, body.recipes, body.items, body.results, body];
      for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
          for (const item of candidate) {
            const slug = typeof item === "object" && item
              ? (item as Record<string, unknown>).slug ?? (item as Record<string, unknown>).id
              : undefined;
            if (typeof slug === "string" && slug.length > 0) {
              allSlugs.add(slug);
            }
          }
        }
      }

      if (allSlugs.size > 0) {
        console.log(`    → ${allSlugs.size} slugs gevonden via API`);
      }

      // Probeer paginatie
      if (allSlugs.size > 0) {
        let page = 2;
        const maxPages = 50;
        while (page <= maxPages) {
          const pageUrl = url.includes("?")
            ? `${url}&page=${page}`
            : `${url}?page=${page}`;
          try {
            const pageRes = await fetch(pageUrl, { method: "GET", headers });
            if (!pageRes.ok) break;
            const pageBody = await pageRes.json() as Record<string, unknown>;
            const pageCandidates = [pageBody.data, pageBody.recipes, pageBody.items, pageBody.results];
            let found = 0;
            for (const candidate of pageCandidates) {
              if (Array.isArray(candidate)) {
                for (const item of candidate) {
                  const slug = typeof item === "object" && item
                    ? (item as Record<string, unknown>).slug ?? (item as Record<string, unknown>).id
                    : undefined;
                  if (typeof slug === "string" && slug.length > 0) {
                    allSlugs.add(slug);
                    found++;
                  }
                }
              }
            }
            if (found === 0) break;
            console.log(`    Pagina ${page}: +${found} slugs (totaal: ${allSlugs.size})`);
            page++;
            await new Promise((r) => setTimeout(r, 200));
          } catch {
            break;
          }
        }
        return true;
      }
    } catch (err) {
      console.log(`    💥 ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return allSlugs.size > 0;
}

// ---- Strategie 2: Sitemap ----
async function trySitemap(): Promise<boolean> {
  const sitemapUrls = [
    `${PG_FRONTEND}/sitemap.xml`,
    `${PG_BASE}/sitemap.xml`,
    `${PG_FRONTEND}/sitemap_index.xml`,
    `${PG_FRONTEND}/sitemap-recipes.xml`,
  ];

  for (const url of sitemapUrls) {
    try {
      console.log(`  Probeer: ${url}`);
      const res = await fetch(url, {
        headers: { Accept: "text/xml,application/xml,*/*" },
      });
      if (!res.ok) {
        console.log(`    ❌ ${res.status}`);
        continue;
      }
      const xml = await res.text();
      console.log(`    ✅ ${res.status} — ${xml.length} bytes`);

      // Extract recipe URLs: /recepten/<slug>
      const recipePattern = /\/recepten\/([a-z0-9-]+)/g;
      let match;
      while ((match = recipePattern.exec(xml)) !== null) {
        if (match[1] && match[1] !== "recepten") {
          allSlugs.add(match[1]);
        }
      }

      if (allSlugs.size > 0) {
        console.log(`    → ${allSlugs.size} slugs gevonden via sitemap`);
        return true;
      }

      // Check for nested sitemaps
      const sitemapRefPattern = /<loc>([^<]*sitemap[^<]*)<\/loc>/g;
      const nestedUrls: string[] = [];
      while ((match = sitemapRefPattern.exec(xml)) !== null) {
        if (match[1]) nestedUrls.push(match[1]);
      }
      if (nestedUrls.length > 0) {
        console.log(`    ${nestedUrls.length} geneste sitemaps gevonden, ophalen...`);
        for (const nested of nestedUrls) {
          try {
            const nestedRes = await fetch(nested, {
              headers: { Accept: "text/xml,application/xml,*/*" },
            });
            if (!nestedRes.ok) continue;
            const nestedXml = await nestedRes.text();
            let nestedMatch;
            while ((nestedMatch = recipePattern.exec(nestedXml)) !== null) {
              if (nestedMatch[1] && nestedMatch[1] !== "recepten") {
                allSlugs.add(nestedMatch[1]);
              }
            }
          } catch { /* ignore */ }
          await new Promise((r) => setTimeout(r, 200));
        }
        if (allSlugs.size > 0) {
          console.log(`    → ${allSlugs.size} slugs gevonden via geneste sitemaps`);
          return true;
        }
      }
    } catch (err) {
      console.log(`    💥 ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return false;
}

// ---- Strategie 3: Website scraping ----
async function tryWebsiteScraping(): Promise<boolean> {
  const baseUrls = [
    `${PG_FRONTEND}/recepten`,
    `${PG_FRONTEND}/recepten/`,
  ];

  for (const url of baseUrls) {
    try {
      console.log(`  Probeer: ${url}`);
      const res = await fetch(url, {
        headers: {
          Accept: "text/html",
          "User-Agent": "MenuFit/1.0 recipe-discovery",
        },
      });
      if (!res.ok) {
        console.log(`    ❌ ${res.status}`);
        continue;
      }
      const html = await res.text();
      console.log(`    ✅ ${res.status} — ${html.length} bytes`);

      // Extract recipe links
      const linkPattern = /href="\/recepten\/([a-z0-9-]+)"/g;
      let match;
      while ((match = linkPattern.exec(html)) !== null) {
        if (match[1] && match[1] !== "recepten") {
          allSlugs.add(match[1]);
        }
      }

      if (allSlugs.size > 0) {
        console.log(`    → ${allSlugs.size} slugs gevonden op pagina 1`);
      }

      // Probeer paginatie
      let page = 2;
      const maxPages = 100;
      while (page <= maxPages) {
        const pageUrl = `${url}?page=${page}`;
        try {
          const pageRes = await fetch(pageUrl, {
            headers: {
              Accept: "text/html",
              "User-Agent": "MenuFit/1.0 recipe-discovery",
            },
          });
          if (!pageRes.ok) break;
          const pageHtml = await pageRes.text();
          let found = 0;
          let pageMatch;
          while ((pageMatch = linkPattern.exec(pageHtml)) !== null) {
            if (pageMatch[1] && pageMatch[1] !== "recepten") {
              const before = allSlugs.size;
              allSlugs.add(pageMatch[1]);
              if (allSlugs.size > before) found++;
            }
          }
          if (found === 0) break;
          console.log(`    Pagina ${page}: +${found} (totaal: ${allSlugs.size})`);
          page++;
          await new Promise((r) => setTimeout(r, 300));
        } catch {
          break;
        }
      }

      if (allSlugs.size > 0) return true;
    } catch (err) {
      console.log(`    💥 ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return false;
}

// ---- Strategie 4: Haal slugs uit week-menu receptlijsten ----
async function tryWeekMenuRecipes(): Promise<boolean> {
  console.log("  Recepten extraheren uit alle weekmenu's (1-53)...");
  const BATCH_SIZE = 5;
  for (let batch = 1; batch <= 53; batch += BATCH_SIZE) {
    const promises = [];
    for (let w = batch; w < Math.min(batch + BATCH_SIZE, 54); w++) {
      promises.push(
        fetch(`${PG_BASE}/api/week-menu/${w}`, { method: "GET", headers })
          .then(async (res) => {
            if (!res.ok) return;
            const body = await res.json() as Record<string, unknown>;
            const data = (typeof body.data === "object" && body.data ? body.data : body) as Record<string, unknown>;
            // Recepten uit recipes array
            const recipes = Array.isArray(data.recipes) ? data.recipes : [];
            for (const recipe of recipes) {
              if (typeof recipe === "object" && recipe) {
                const slug = (recipe as Record<string, unknown>).slug;
                if (typeof slug === "string" && slug.length > 0) {
                  allSlugs.add(slug);
                }
              }
            }
            // Recepten uit day_menu HTML (href="/recepten/<slug>")
            const dayMenus = Array.isArray(data.day_menus) ? data.day_menus : [];
            for (const dm of dayMenus) {
              if (typeof dm !== "object" || !dm) continue;
              const variants = Array.isArray((dm as Record<string, unknown>).day_menu_variants)
                ? (dm as Record<string, unknown>).day_menu_variants as unknown[]
                : [];
              for (const variant of variants) {
                if (typeof variant !== "object" || !variant) continue;
                const moments = (variant as Record<string, unknown>).moments;
                if (typeof moments !== "object" || !moments) continue;
                for (const html of Object.values(moments as Record<string, unknown>)) {
                  if (typeof html !== "string") continue;
                  const slugMatch = /href="\/recepten\/([^"]+)"/.exec(html);
                  if (slugMatch?.[1]) allSlugs.add(slugMatch[1]);
                }
              }
            }
          })
          .catch(() => { /* ignore */ }),
      );
    }
    await Promise.all(promises);
  }
  console.log(`    → ${allSlugs.size} slugs uit weekmenu's`);
  return allSlugs.size > 0;
}

// ---- Hoofdprogramma ----
console.log("📋  Strategie 1: API receptlijst endpoints");
const apiOk = await tryApiListing();

if (!apiOk || allSlugs.size < 500) {
  console.log("\n📋  Strategie 2: Sitemap");
  await trySitemap();
}

if (allSlugs.size < 500) {
  console.log("\n📋  Strategie 3: Website scraping");
  await tryWebsiteScraping();
}

if (allSlugs.size < 500) {
  console.log("\n📋  Strategie 4: Weekmenu recepten");
  await tryWeekMenuRecipes();
}

// ---- Output ----
const slugs = Array.from(allSlugs).sort();
console.log(`\n${"─".repeat(70)}`);
console.log(`Totaal: ${slugs.length} unieke recept-slugs gevonden`);

if (slugs.length > 0) {
  await mkdir(join(ROOT, "out"), { recursive: true });
  await writeFile(
    OUTPUT_PATH,
    JSON.stringify({ discoveredAt: new Date().toISOString(), count: slugs.length, slugs }, null, 2),
    "utf8",
  );
  console.log(`Opgeslagen: ${OUTPUT_PATH}`);
  console.log(`\nEerste 10: ${slugs.slice(0, 10).join(", ")}`);
  console.log(`Laatste 10: ${slugs.slice(-10).join(", ")}`);
} else {
  console.log("Geen recepten gevonden. Controleer login-gegevens en probeer handmatig:");
  console.log(`  curl -H "Authorization: Bearer <token>" ${PG_BASE}/api/recipes`);
}
