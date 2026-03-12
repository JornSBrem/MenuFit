/**
 * Mapper: PG API week-menu response → BronzeLikeWeekPayload
 *
 * De PG API geeft een weekmenu terug in het formaat:
 *   { day_menus: DayMenu[], recipes: Recipe[], groceries: Record<string,string>, ... }
 *
 * De silver transformer verwacht:
 *   { meals: BronzeLikeMeal[], pdfLines?: string[] }
 *
 * Deze module converteert het PG-formaat naar het interne formaat.
 * Alle 6 maaltijdmomenten per dag worden geëxtraheerd (ontbijt t/m snack).
 */
import type { BronzeLikeGroceryItem, BronzeLikeMeal, BronzeLikeWeekPayload } from "../silver/types.ts";

// ---- PG API types (intern, voor type-safety in de mapper) ------------------

interface PgMoments {
  breakfast?: string;
  breakfast_kilocalories?: string | number;
  between_breakfast_lunch?: string;
  between_breakfast_lunch_kilocalories?: string | number;
  lunch?: string;
  lunch_kilocalories?: string | number;
  between_lunch_dinner?: string;
  between_lunch_dinner_kilocalories?: string | number;
  dinner?: string;
  dinner_kilocalories?: string | number;
  snack?: string;
  snack_kilocalories?: string | number;
}

interface PgDayMenuVariant {
  /** Totale calorieen van dit dagmenu-variant (bijv. 1250, 1500, 1800, 2100) */
  calories?: number;
  moments?: PgMoments;
}

interface PgDayMenu {
  id?: number;
  title?: string;
  /** Slug bevat daglabel als suffix: bijv. "gerecht-week-9-ma" */
  slug?: string;
  day_menu_variants?: PgDayMenuVariant[];
}

interface PgRecipe {
  title?: string;
  slug?: string;
  media?: {
    imageConversions?: {
      medium?: string;
    };
  };
}

interface PgWeekData {
  id?: number;
  week_number?: number;
  day_menus?: PgDayMenu[];
  recipes?: PgRecipe[];
  /**
   * Boodschappenlijst als object met HTML-waarden per categorie:
   *   { vegetables_fruit: "<p>aardbeien</p><p>banaan</p>", ... }
   */
  groceries?: Record<string, string>;
}

// ---- Maaltijdmoment-definitie ----------------------------------------------

/** Volgorde en Nederlandse labels van de PG maaltijdmomenten */
const MOMENT_DEFS: Array<{
  key: keyof PgMoments;
  kcalKey: keyof PgMoments;
  label: string;
}> = [
  { key: "breakfast", kcalKey: "breakfast_kilocalories", label: "Ontbijt" },
  { key: "between_breakfast_lunch", kcalKey: "between_breakfast_lunch_kilocalories", label: "Tussendoor (ochtend)" },
  { key: "lunch", kcalKey: "lunch_kilocalories", label: "Lunch" },
  { key: "between_lunch_dinner", kcalKey: "between_lunch_dinner_kilocalories", label: "Tussendoor (middag)" },
  { key: "dinner", kcalKey: "dinner_kilocalories", label: "Diner" },
  { key: "snack", kcalKey: "snack_kilocalories", label: "Snack" },
];

// ---- Hulpfuncties ----------------------------------------------------------

const DAY_ABBR_TO_NL: Record<string, string> = {
  ma: "maandag",
  di: "dinsdag",
  wo: "woensdag",
  do: "donderdag",
  vr: "vrijdag",
  za: "zaterdag",
  zo: "zondag",
};

/**
 * Verwijdert HTML-tags en decodeert veelvoorkomende HTML-entities.
 */
const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&euml;/g, "ë")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&agrave;/g, "à")
    .replace(/&auml;/g, "ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .trim();

/**
 * Extraheert daglabel (nl) uit een dag-menu slug.
 * Slug-patroon: "<titel>-week-<n>-<dagafkorting>"
 * Bijv.: "gepofte-aardappels-week-9-ma" → "maandag"
 */
const extractDayLabel = (slug: string): string => {
  const match = /\bweek-\d+-([a-z]+)$/.exec(slug);
  if (match?.[1]) {
    return DAY_ABBR_TO_NL[match[1]] ?? match[1];
  }
  return slug;
};

/**
 * Extraheert de recept-slug uit een moment-HTML string.
 * Bijv.: <a href="/recepten/gepofte-aardappels"> → "gepofte-aardappels"
 */
const extractRecipeSlug = (html: string): string | undefined => {
  const match = /href="\/recepten\/([^"]+)"/.exec(html);
  return match?.[1];
};

/**
 * Extraheert de receptnaam uit de ankertekst in moment-HTML.
 * Bijv.: <a href="/recepten/hete-bliksem">hete bliksem (recept)</a> → "Hete bliksem"
 */
const extractRecipeName = (html: string): string | undefined => {
  const match = /<a\b[^>]*>([\s\S]*?)<\/a>/i.exec(html);
  if (!match?.[1]) return undefined;
  return stripHtml(match[1])
    .replace(/\s*\(recept\)\s*$/i, "")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase()) || undefined;
};

/** Bekende eenheden die tussen hoeveelheid en productnaam staan */
const KNOWN_UNITS = new Set([
  "gram", "g", "gr", "kg",
  "ml", "l", "dl", "cl",
  "el", "tl",
  "stuk", "stuks", "teen", "plak", "plakken", "plakje", "plakjes",
  "blikje", "blik", "pot", "potje",
  "zakje", "zak", "fles",
  "schijf", "schijfje", "schijfjes",
  "snufje", "takje", "takjes",
  "eetlepel", "eetlepels", "theelepel", "theelepels",
  "handvol", "bosje",
]);

/**
 * Splitst een ingrediënttekst in hoeveelheid, eenheid en productnaam.
 * Voorbeelden:
 *   "1 appel"           → { text: "appel", amount: "1" }
 *   "200 gram gehakt"   → { text: "gehakt", amount: "200", unit: "gram" }
 *   "½ avocado"         → { text: "avocado", amount: "0.5" }
 *   "peper naar smaak"  → { text: "peper naar smaak" }
 */
const parseIngredientText = (raw: string): { text: string; amount?: string; unit?: string } => {
  const trimmed = raw.trim();

  // Patroon: optioneel getal (met fractie-tekens) + optioneel eenheid + productnaam
  const match = /^(\d+[½¼¾]?|[½¼¾]|\d+[.,]\d+|\d+\/\d+)\s*(.*)$/.exec(trimmed);
  if (!match) {
    return { text: trimmed };
  }

  let amountStr = match[1]
    .replace("½", ".5")
    .replace("¼", ".25")
    .replace("¾", ".75");

  // Fractie-notatie: "1/2" → "0.5"
  if (amountStr.includes("/")) {
    const [num, den] = amountStr.split("/");
    const frac = parseFloat(num) / parseFloat(den);
    if (Number.isFinite(frac)) amountStr = String(frac);
  }

  // Combinatie: "1.5" of "1,5"
  amountStr = amountStr.replace(",", ".");

  const rest = match[2].trim();
  if (!rest) {
    return { text: trimmed };
  }

  // Kijk of het eerste woord van rest een bekende eenheid is
  const spaceIdx = rest.indexOf(" ");
  if (spaceIdx > 0) {
    const firstWord = rest.slice(0, spaceIdx).toLowerCase();
    if (KNOWN_UNITS.has(firstWord)) {
      const product = rest.slice(spaceIdx + 1).trim();
      if (product.length > 0) {
        return { text: product, amount: amountStr, unit: firstWord };
      }
    }
  }

  // Geen eenheid gevonden → getal is hoeveelheid, rest is product
  return { text: rest, amount: amountStr };
};

/**
 * Converteert moment-HTML naar een lijst van ingrediëntteksten.
 * Elke <p> is één ingrediënt; links worden gereduceerd tot hun tekst.
 * Blokken met een receptlink (href="/recepten/...") worden overgeslagen —
 * dat is de receptnaam, geen ingrediënt.
 */
const extractIngredients = (html: string): Array<{ text: string; amount?: string; unit?: string }> => {
  const blocks = html.split(/<\/p>/i);
  const ingredients: Array<{ text: string; amount?: string; unit?: string }> = [];
  for (const block of blocks) {
    // Sla blokken over die een receptlink bevatten (dit is de receptnaam, geen ingrediënt)
    if (/href="\/recepten\//i.test(block)) continue;
    const stripped = stripHtml(block.replace(/<p[^>]*>/i, "")).trim();
    if (stripped.length > 0) {
      ingredients.push(parseIngredientText(stripped));
    }
  }
  return ingredients;
};

/**
 * Extraheert boodschappenlijstregels uit het `groceries`-object.
 * De waarden zijn HTML-strings per categorie; elke <p> wordt één regel.
 */
const extractGroceryLines = (groceries: Record<string, string> | undefined): string[] => {
  if (!groceries) return [];
  const lines: string[] = [];
  for (const html of Object.values(groceries)) {
    if (typeof html !== "string") continue;
    const blocks = html.split(/<\/p>/i);
    for (const block of blocks) {
      const text = stripHtml(block.replace(/<p[^>]*>/i, "")).trim();
      if (text.length > 0) lines.push(text);
    }
  }
  return lines;
};

/**
 * Extraheert boodschappenlijstitems met categorie uit het `groceries`-object.
 * PG API retourneert: { vegetables_fruit: "<p>aardbeien</p>", dairy: "<p>melk</p>", ... }
 */
const extractCategorizedGroceryItems = (groceries: Record<string, string> | undefined): BronzeLikeGroceryItem[] => {
  if (!groceries) return [];
  const items: BronzeLikeGroceryItem[] = [];
  for (const [category, html] of Object.entries(groceries)) {
    if (typeof html !== "string") continue;
    const blocks = html.split(/<\/p>/i);
    for (const block of blocks) {
      const text = stripHtml(block.replace(/<p[^>]*>/i, "")).trim();
      if (text.length > 0) items.push({ category, text });
    }
  }
  return items;
};

/**
 * Zet een kcal-waarde (string of number) om naar een geheel getal.
 */
const parseKcal = (raw: string | number | undefined): number | undefined => {
  if (raw === undefined || raw === null) return undefined;
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : undefined;
};

// ---- Publieke mapper --------------------------------------------------------

/**
 * Converteert een PG API weekmenu-response naar het interne BronzeLikeWeekPayload.
 *
 * @param pgData  Het `data`-object uit de PG API response (na uitpakken van de
 *                buitenste envelope: `response.data`)
 * @param kcal    Gewenste kcal-variant (bijv. 1250, 1500, 1800, 2100).
 *                Als de variant niet bestaat, wordt de eerste variant gebruikt.
 */
export const mapPgWeekDataToSilverPayload = (
  pgData: unknown,
  kcal: number,
): BronzeLikeWeekPayload => {
  if (typeof pgData !== "object" || pgData === null) {
    return { meals: [] };
  }

  const data = pgData as PgWeekData;
  const dayMenus = data.day_menus ?? [];

  // Bouw recept-slug → afbeelding-URL lookup
  const recipeImageMap = new Map<string, string>();
  for (const recipe of data.recipes ?? []) {
    const imageUrl = recipe.media?.imageConversions?.medium;
    if (recipe.slug && imageUrl) {
      recipeImageMap.set(recipe.slug, imageUrl);
    }
  }

  const meals: BronzeLikeMeal[] = [];

  for (const dayMenu of dayMenus) {
    const slug = dayMenu.slug ?? "";
    const dayLabel = extractDayLabel(slug);

    const variants = dayMenu.day_menu_variants ?? [];
    // Zoek variant die overeenkomt met gewenste kcal; fallback op dichtstbijzijnde
    const variant =
      variants.find((v) => v.calories === kcal) ??
      variants.find((v) => typeof v.calories === "number") ??
      variants[0];

    if (!variant?.moments) continue;

    for (const def of MOMENT_DEFS) {
      const html = variant.moments[def.key] as string | undefined;
      if (!html || !html.trim()) continue;

      const recipeSlug = extractRecipeSlug(html);
      const recipeName = extractRecipeName(html);
      const ingredients = extractIngredients(html);
      // Sla het moment over als er géén ingrediënten én géén recept is (volledig leeg moment)
      if (ingredients.length === 0 && !recipeSlug) continue;
      const imageUrl = recipeSlug ? recipeImageMap.get(recipeSlug) : undefined;
      const momentKcal = parseKcal(variant.moments[def.kcalKey] as string | number | undefined);

      meals.push({
        day: dayLabel,
        meal: def.label,
        recipeId: recipeSlug,
        recipeName,
        imageUrl,
        kcal: momentKcal,
        ingredients,
      });
    }
  }

  const pdfLines = extractGroceryLines(data.groceries);
  const categorizedGroceries = extractCategorizedGroceryItems(data.groceries);

  return { meals, pdfLines, categorizedGroceries };
};
