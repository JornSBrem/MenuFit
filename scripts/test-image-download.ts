/**
 * Lokale test: download een receptfoto en sla op in out/v3/images/
 *
 * Gebruik: npx tsx scripts/test-image-download.ts
 */
import { mkdir, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const IMAGES_DIR = join(ROOT, "out", "v3", "images");

// Test met een paar bekende recepten
const TEST_SLUGS = [
  "aardappelpuree-met-paprika-en-knoflook",
  "appeltaart",
  "bananenbrood",
];

async function fetchImageUrlFromHtml(slug: string): Promise<string | undefined> {
  const url = `https://projectgezond.nl/recepten/${slug}`;
  console.log(`  [html] Ophalen: ${url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0 (compatible; MenuFit/1.0)",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.log(`  [html] Status ${response.status}`);
      return undefined;
    }

    const html = await response.text();
    const match = html.match(/itemprop="image"\s*(?:src="([^"]+)"|[^>]*src="([^"]+)")/);
    const imageUrl = match?.[1] ?? match?.[2];
    if (!imageUrl) {
      const fallback = html.match(/src="([^"]+)"[^>]*itemprop="image"/);
      return fallback?.[1];
    }
    return imageUrl;
  } catch (err) {
    clearTimeout(timeout);
    console.log(`  [html] Error: ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
}

async function downloadImage(slug: string, externalUrl: string): Promise<string | null> {
  console.log(`  [download] ${externalUrl}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(externalUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MenuFit/1.0)" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.log(`  [download] Status ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    let ext = ".jpg";
    if (contentType.includes("png")) ext = ".png";
    else if (contentType.includes("webp")) ext = ".webp";

    const buffer = Buffer.from(await response.arrayBuffer());
    await mkdir(IMAGES_DIR, { recursive: true });
    const filename = `${slug}${ext}`;
    await writeFile(join(IMAGES_DIR, filename), buffer);
    console.log(`  [download] Opgeslagen: ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return `/api/v3/images/${filename}`;
  } catch (err) {
    clearTimeout(timeout);
    console.log(`  [download] Error: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function main() {
  console.log("=== Test: receptfoto's downloaden ===\n");

  for (const slug of TEST_SLUGS) {
    console.log(`\n--- ${slug} ---`);

    const imageUrl = await fetchImageUrlFromHtml(slug);
    if (!imageUrl) {
      console.log("  Geen afbeelding gevonden, skip.");
      continue;
    }
    console.log(`  Image URL: ${imageUrl}`);

    const localPath = await downloadImage(slug, imageUrl);
    if (localPath) {
      console.log(`  Lokaal pad: ${localPath}`);
    }

    // Wacht even tussen requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Toon wat er in de images dir staat
  try {
    const files = await readdir(IMAGES_DIR);
    console.log(`\n=== Bestanden in ${IMAGES_DIR}: ===`);
    for (const f of files) console.log(`  ${f}`);
  } catch {
    console.log("\nImages directory bestaat nog niet.");
  }

  console.log("\nKlaar!");
}

main().catch(console.error);
