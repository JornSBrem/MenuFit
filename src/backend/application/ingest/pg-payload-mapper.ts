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
 */
import type { BronzeLikeMeal, BronzeLikeWeekPayload } from "../silver/types.ts";

// ---- PG API types (intern, voor type-safety in de mapper) ------------------

interface PgMoments {
  dinner?: string;
  dinner_kilocalories?: string | number;
  breakfast?: string;
  lunch?: string;
  snack?: string;
  between_breakfast_lunch?: string;
  between_lunch_dinner?: string;
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

interface PgWeekData {
  id?: number;
  week_number?: number;
  day_menus?: PgDayMenu[];
  recipes?: Array<{ title?: string; slug?: string }>;
  /**
   * Boodschappenlijst als object met HTML-waarden per categorie:
   *   { vegetables_fruit: "<p>aardbeien</p><p>banaan</p>", ... }
   */
  groceries?: Record<string, string>;
}

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
 * Extraheert de recept-slug uit een dinner-HTML string.
 * Bijv.: <a href="/recepten/gepofte-aardappels"> → "gepofte-aardappels"
 */
const extractRecipeSlug = (html: string): string | undefined => {
  const match = /href="\/recepten\/([^"]+)"/.exec(html);
  return match?.[1];
};

/**
 * Converteert dinner-HTML naar een lijst van ingrediëntteksten.
 * Elke <p> is één ingrediënt; links worden gereduceerd tot hun tekst.
 */
const extractIngredients = (html: string): Array<{ text: string }> => {
  // Splits op <p>…</p> blokken (case-insensitief, multiline)
  const blocks = html.split(/<\/p>/i);
  const ingredients: Array<{ text: string }> = [];
  for (const block of blocks) {
    const stripped = stripHtml(block.replace(/<p[^>]*>/i, "")).trim();
    if (stripped.length > 0) {
      ingredients.push({ text: stripped });
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
  const meals: BronzeLikeMeal[] = [];

  for (const dayMenu of dayMenus) {
    const slug = dayMenu.slug ?? "";
    const dayLabel = extractDayLabel(slug);

    const variants = dayMenu.day_menu_variants ?? [];
    // Zoek variant die overeenkomt met gewenste kcal; fallback op eerste
    const variant =
      variants.find((v) => v.calories === kcal) ??
      variants.find((v) => typeof v.calories === "number") ??
      variants[0];

    if (!variant?.moments) continue;

    const { dinner } = variant.moments;
    if (!dinner) continue;

    const ingredients = extractIngredients(dinner);
    const recipeId = extractRecipeSlug(dinner);

    meals.push({
      day: dayLabel,
      meal: "avondeten",
      recipeId,
      ingredients,
    });
  }

  const pdfLines = extractGroceryLines(data.groceries);

  return { meals, pdfLines };
};
