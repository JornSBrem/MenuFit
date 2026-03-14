/**
 * Scraper voor recepten van projectgezond.nl HTML-pagina's.
 * Fallback voor recepten die niet via de PG API beschikbaar zijn (404).
 */

import type { RecipeView } from "../../application/gold/types.ts";
import type {
  GoldMealIngredient,
  GoldRecipeStep,
  GoldRecipeTip,
  GoldRecipePreparationTime,
  GoldRecipeNutrition,
} from "../../application/gold/types.ts";
import { stripHtml } from "./pg-recipe-normalizer.ts";

const PG_FRONTEND = "https://projectgezond.nl";

/** Decode numerieke en benoemde HTML entities die stripHtml niet dekt */
const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&amp;/g, "&");

/** Haalt de eerste regex-match op uit de HTML */
const extractFirst = (html: string, pattern: RegExp): string | undefined => {
  const match = pattern.exec(html);
  return match?.[1]?.trim();
};

/** Haalt alle regex-matches op als array */
const extractAll = (html: string, pattern: RegExp): string[] => {
  const results: string[] = [];
  let match;
  while ((match = pattern.exec(html)) !== null) {
    if (match[1]) results.push(match[1].trim());
  }
  return results;
};

const parseTitle = (html: string): string => {
  return extractFirst(html, /itemprop="name"[^>]*>([^<]+)</) ?? "Onbekend recept";
};

const parseImageUrl = (html: string): string | undefined => {
  return extractFirst(html, /itemprop="image"\s*(?:src="([^"]+)"|[^>]*src="([^"]+)")/)
    ?? extractFirst(html, /src="([^"]+)"[^>]*itemprop="image"/);
};

const parsePrepTime = (html: string): GoldRecipePreparationTime[] => {
  const times: GoldRecipePreparationTime[] = [];

  const totalMatch = html.match(/itemprop="totalTime"\s+content="PT(\d+)([HM])"/);
  if (totalMatch) {
    const amount = parseInt(totalMatch[1], 10);
    const unit = totalMatch[2] === "H" ? "uur" : "min";
    times.push({ amount, unit, label: `${amount} ${unit}` });
  } else {
    const prepMatch = html.match(/itemprop="prepTime"\s+content="PT(\d+)([HM])"/);
    if (prepMatch) {
      const amount = parseInt(prepMatch[1], 10);
      const unit = prepMatch[2] === "H" ? "uur" : "min";
      times.push({ amount, unit, label: `${amount} ${unit}` });
    }
  }

  return times;
};

const parseKcal = (html: string): number | undefined => {
  const match = html.match(/itemprop="calories"[^>]*>\s*<dt>(\d+)<\/dt>/);
  if (match) return parseInt(match[1], 10);
  // Fallback: zoek in de header area
  const headerMatch = html.match(/(\d+)\s*kcal/i);
  return headerMatch ? parseInt(headerMatch[1], 10) : undefined;
};

const parseTags = (html: string): string[] => {
  // Categories uit de article CSS classes (meest betrouwbaar)
  const articleMatch = html.match(/class="recipe[^"]*\bcategory-([^"]+)"/);
  if (articleMatch) {
    const classes = articleMatch[0];
    const catPattern = /\bcategory-([a-z0-9-]+)/g;
    const tags: string[] = [];
    let match;
    while ((match = catPattern.exec(classes)) !== null) {
      // Converteer slug naar leesbare naam
      const tag = match[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      tags.push(tag);
    }
    return [...new Set(tags)];
  }
  return [];
};

const parseIngredients = (html: string): GoldMealIngredient[] => {
  // Primair: parse de JS ingredientCalculation data (meest betrouwbaar)
  const jsMatch = html.match(/setInitialRecipeIngredientsList\((\[[\s\S]*?\])\)/);
  if (jsMatch) {
    try {
      const data = JSON.parse(jsMatch[1]) as Array<{
        recipe_ingredient: { recipe_ingredient_amount: string; recipe_ingredient_name: string };
      }>;
      return data.map((item) => ({
        text: `${item.recipe_ingredient.recipe_ingredient_amount} ${item.recipe_ingredient.recipe_ingredient_name}`.trim(),
      }));
    } catch {
      // Fallback naar HTML parsing
    }
  }

  // Fallback: parse ingredient divs
  const ingredients: GoldMealIngredient[] = [];
  const ingredientPattern = /class="ingredient"[^>]*itemprop="recipeIngredient"[^>]*>\s*<dt>([^<]*)<\/dt>\s*<dd>([^<]*)<\/dd>/g;
  let match;
  while ((match = ingredientPattern.exec(html)) !== null) {
    const amount = match[1]?.trim() ?? "";
    const name = match[2]?.trim() ?? "";
    ingredients.push({ text: `${amount} ${name}`.trim() });
  }
  return ingredients;
};

const parseSteps = (html: string): GoldRecipeStep[] => {
  // Zoek het recipeInstructions blok
  const instructionsMatch = html.match(
    /itemprop="recipeInstructions"[^>]*>([\s\S]*?)<\/div>/,
  );
  if (!instructionsMatch) return [];

  const instructionsHtml = instructionsMatch[1];
  const stepPattern = /<li>([\s\S]*?)<\/li>/g;
  const steps: GoldRecipeStep[] = [];
  let match;
  let stepNum = 0;
  while ((match = stepPattern.exec(instructionsHtml)) !== null) {
    const text = decodeHtmlEntities(stripHtml(match[1]).trim());
    if (text.length > 0) {
      stepNum++;
      steps.push({ step: stepNum, text });
    }
  }
  return steps;
};

const parseTips = (html: string): GoldRecipeTip[] => {
  // Zoek het Tips & tricks blok
  const tipsMatch = html.match(
    /Tips\s*(?:&amp;|&)\s*tricks<\/h2>\s*([\s\S]*?)(?:<h2|<div class="my-4">|$)/,
  );
  if (!tipsMatch) return [];

  const tipsHtml = tipsMatch[1];
  const tipPattern = /<li>([\s\S]*?)<\/li>/g;
  const tips: GoldRecipeTip[] = [];
  let match;
  while ((match = tipPattern.exec(tipsHtml)) !== null) {
    const text = decodeHtmlEntities(stripHtml(match[1]).trim());
    if (text.length > 0) {
      tips.push({ text });
    }
  }
  return tips;
};

const parseDescription = (html: string): string | undefined => {
  const descMatch = html.match(/itemprop="description"[^>]*>([\s\S]*?)<\/div>/);
  if (!descMatch) return undefined;
  const text = decodeHtmlEntities(stripHtml(descMatch[1]).trim());
  return text.length > 0 ? text : undefined;
};

const parseNutrition = (html: string): GoldRecipeNutrition[] => {
  const nutritionMap: Record<string, { code: string; label: string }> = {
    calories: { code: "kcal", label: "Kcal" },
    proteinContent: { code: "protein", label: "Eiwitten" },
    carbohydrateContent: { code: "carbs", label: "Koolhydraten" },
    fatContent: { code: "fat", label: "Vet" },
    fiberContent: { code: "fiber", label: "Vezels" },
    saturatedFatContent: { code: "saturated_fat", label: "Verzadigd vet" },
    sodiumContent: { code: "sodium", label: "Natrium" },
    sugarContent: { code: "sugar", label: "Suikers" },
  };

  const nutrition: GoldRecipeNutrition[] = [];
  const nutritionPattern = /itemprop="(\w+)"[^>]*>\s*<dt>([^<]*)<\/dt>\s*<dd>([^<]*)<\/dd>/g;
  let match;
  while ((match = nutritionPattern.exec(html)) !== null) {
    const itemprop = match[1];
    const dtValue = match[2]?.trim() ?? "";
    const ddLabel = match[3]?.trim() ?? "";

    const mapping = nutritionMap[itemprop];
    if (!mapping) continue;

    // Parse het getal uit de dt waarde (bijv. "4 gram" → 4)
    const numMatch = dtValue.match(/(\d+(?:[.,]\d+)?)/);
    const amount = numMatch ? parseFloat(numMatch[1].replace(",", ".")) : undefined;
    const unit = dtValue.replace(/[\d.,]+\s*/, "").trim() || undefined;

    nutrition.push({
      code: mapping.code,
      label: ddLabel || mapping.label,
      amount,
      unit,
    });
  }

  return nutrition;
};

const parseRecipeYield = (html: string): string | undefined => {
  // Parse de serving info (bijv. "1 cake (14 plakken)" of "4 personen")
  const yieldMatch = html.match(
    /itemprop="recipeYield"[\s\S]*?<span id="recipe-amount-per-subject">(\d+)<\/span>\s*<span>([^<]+)<\/span>/,
  );
  if (yieldMatch) {
    return `${yieldMatch[1]} ${yieldMatch[2].trim()}`;
  }
  return undefined;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Haalt een recept op via de projectgezond.nl website en parsed de HTML.
 * Gooit een error als de pagina niet gevonden kan worden.
 * Retry bij 429/503 met exponential backoff.
 */
export const fetchPgRecipeFromHtml = async (slug: string): Promise<RecipeView> => {
  const url = `${PG_FRONTEND}/recepten/${slug}`;

  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch(url, {
      headers: {
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0 (compatible; MenuFit/1.0)",
      },
      redirect: "follow",
    });

    if (response.status === 429 || response.status === 503) {
      const retryAfter = response.headers.get("retry-after");
      const waitMs = retryAfter ? parseFloat(retryAfter) * 1000 : (attempt + 1) * 10_000;
      await sleep(waitMs);
      continue;
    }
    break;
  }

  if (!response || !response.ok) {
    throw new Error(`HTML scrape failed (${response?.status ?? "no response"}) for ${url}`);
  }

  const html = await response.text();

  // Controleer of het daadwerkelijk een receptpagina is
  if (!html.includes('itemtype="https://schema.org/Recipe"')) {
    throw new Error(`Geen receptpagina gevonden voor ${slug}`);
  }

  const title = parseTitle(html);
  const imageUrl = parseImageUrl(html);
  const ingredients = parseIngredients(html);
  const steps = parseSteps(html);
  const tips = parseTips(html);
  const description = parseDescription(html);
  const nutrition = parseNutrition(html);
  const prepTimes = parsePrepTime(html);
  const kcal = parseKcal(html);
  const tags = parseTags(html);
  const recipeYield = parseRecipeYield(html);

  return {
    recipeId: slug,
    slug,
    name: title,
    imageUrl,
    kcal,
    ingredients: ingredients.length > 0 ? ingredients : undefined,
    steps: steps.length > 0 ? steps : undefined,
    intro: description,
    ingredientsRelatesTo: recipeYield,
    prepTimes: prepTimes.length > 0 ? prepTimes : undefined,
    tips: tips.length > 0 ? tips : undefined,
    nutrition: nutrition.length > 0 ? nutrition : undefined,
    tags: tags.length > 0 ? tags : undefined,
    importedAt: new Date().toISOString(),
    sourceUrl: url,
  };
};

/**
 * Haalt alleen de afbeelding-URL op voor een recept via de website.
 * Retourneert undefined als er geen afbeelding gevonden wordt.
 */
export const fetchPgRecipeImageUrl = async (slug: string): Promise<string | undefined> => {
  const url = `${PG_FRONTEND}/recepten/${slug}`;

  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch(url, {
      headers: {
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0 (compatible; MenuFit/1.0)",
      },
      redirect: "follow",
    });

    if (response.status === 429 || response.status === 503) {
      const retryAfter = response.headers.get("retry-after");
      const waitMs = retryAfter ? parseFloat(retryAfter) * 1000 : (attempt + 1) * 10_000;
      await sleep(waitMs);
      continue;
    }
    break;
  }

  if (!response || !response.ok) return undefined;

  const html = await response.text();
  return parseImageUrl(html);
};
