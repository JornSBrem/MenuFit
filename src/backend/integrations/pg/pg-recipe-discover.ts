/**
 * Ontdekt alle recept-slugs via de projectgezond.nl sitemap.
 */

const PG_FRONTEND = "https://projectgezond.nl";
const RECIPE_SLUG_PATTERN = /\/recepten\/([a-z0-9-]+)/g;
const NESTED_SITEMAP_PATTERN = /<loc>([^<]*sitemap[^<]*)<\/loc>/g;

const extractRecipeSlugs = (xml: string): Set<string> => {
  const slugs = new Set<string>();
  let match;
  while ((match = RECIPE_SLUG_PATTERN.exec(xml)) !== null) {
    if (match[1] && match[1] !== "recepten") {
      slugs.add(match[1]);
    }
  }
  return slugs;
};

export interface PgRecipeDiscoverResult {
  slugs: string[];
  source: string;
  discoveredAt: string;
}

/**
 * Haalt alle recept-slugs op uit de projectgezond.nl sitemap.
 * Volgt automatisch geneste sitemaps.
 */
export const discoverPgRecipeSlugs = async (): Promise<PgRecipeDiscoverResult> => {
  const allSlugs = new Set<string>();

  const sitemapUrl = `${PG_FRONTEND}/sitemap.xml`;
  const res = await fetch(sitemapUrl, {
    headers: { Accept: "text/xml,application/xml,*/*" },
  });

  if (!res.ok) {
    throw new Error(`Sitemap ophalen mislukt: HTTP ${res.status} voor ${sitemapUrl}`);
  }

  const xml = await res.text();

  // Directe slugs uit hoofdsitemap
  for (const slug of extractRecipeSlugs(xml)) {
    allSlugs.add(slug);
  }

  // Geneste sitemaps volgen
  const nestedUrls: string[] = [];
  let match;
  while ((match = NESTED_SITEMAP_PATTERN.exec(xml)) !== null) {
    if (match[1]) nestedUrls.push(match[1]);
  }

  for (const nestedUrl of nestedUrls) {
    try {
      const nestedRes = await fetch(nestedUrl, {
        headers: { Accept: "text/xml,application/xml,*/*" },
      });
      if (!nestedRes.ok) continue;
      const nestedXml = await nestedRes.text();
      for (const slug of extractRecipeSlugs(nestedXml)) {
        allSlugs.add(slug);
      }
    } catch {
      // Negeer individuele sitemap-fouten
    }
  }

  return {
    slugs: Array.from(allSlugs).sort(),
    source: "sitemap",
    discoveredAt: new Date().toISOString(),
  };
};
