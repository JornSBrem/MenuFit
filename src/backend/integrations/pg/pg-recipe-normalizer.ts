import type {
  GoldLinkedDayMenuView,
  GoldMealIngredient,
  GoldRecipeNutrition,
  GoldRecipePreparationTime,
  GoldRecipeStep,
  GoldRecipeTip,
  RecipeView,
} from "../../application/gold/types.ts";

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const decodeEntities = (value: string): string =>
  value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

export const stripHtml = (value: string): string =>
  decodeEntities(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();

const htmlToParagraphLines = (html: string): string[] =>
  stripHtml(html)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const normalizeIngredientLines = (html: string): GoldMealIngredient[] =>
  htmlToParagraphLines(html).map((text) => ({ text }));

const normalizeTextSteps = (values: unknown[], fieldName: string): GoldRecipeStep[] =>
  values
    .map((entry) => {
      if (typeof entry === "string") {
        return stripHtml(entry);
      }
      if (!isRecord(entry)) {
        return "";
      }
      return stripHtml(String(entry[fieldName] ?? ""));
    })
    .filter((text) => text.length > 0)
    .map((text, index) => ({ step: index + 1, text }));

const normalizeTips = (values: unknown[]): GoldRecipeTip[] =>
  values
    .map((entry) => {
      if (typeof entry === "string") {
        return stripHtml(entry);
      }
      if (!isRecord(entry)) {
        return "";
      }
      return stripHtml(String(entry.tip ?? entry.text ?? ""));
    })
    .filter((text) => text.length > 0)
    .map((text) => ({ text }));

const normalizePreparationTimes = (values: unknown[]): GoldRecipePreparationTime[] =>
  values
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }
      const amountRaw = entry.preparation_time_amount ?? entry.amount;
      const amount =
        typeof amountRaw === "number"
          ? amountRaw
          : typeof amountRaw === "string" && amountRaw.trim().length > 0
            ? Number(amountRaw)
            : undefined;
      const unit =
        typeof entry.preparation_time_property === "string"
          ? entry.preparation_time_property
          : typeof entry.unit === "string"
            ? entry.unit
            : undefined;
      const label = [Number.isFinite(amount) ? String(amount) : "", unit ?? ""].filter(Boolean).join(" ").trim();
      if (!label) {
        return null;
      }
      return {
        amount: Number.isFinite(amount) ? amount : undefined,
        unit,
        label,
      };
    })
    .filter((value): value is GoldRecipePreparationTime => value !== null);

const normalizeNutrition = (values: unknown[]): GoldRecipeNutrition[] =>
  values
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }
      const code = typeof entry.code === "string" ? entry.code : "";
      const label = typeof entry.value === "string" ? entry.value : code;
      const amountRaw = entry.amount;
      const amount =
        typeof amountRaw === "number"
          ? amountRaw
          : typeof amountRaw === "string" && amountRaw.trim().length > 0
            ? Number(amountRaw)
            : undefined;
      const unit = typeof entry.unit === "string" ? entry.unit : undefined;
      if (!code && !label) {
        return null;
      }
      return {
        code: code || label,
        label: label || code,
        amount: Number.isFinite(amount) ? amount : undefined,
        unit,
      };
    })
    .filter((value): value is GoldRecipeNutrition => value !== null);

const normalizeLinkedDayMenus = (values: unknown[]): GoldLinkedDayMenuView[] =>
  values
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }
      const variants = Array.isArray(entry.day_menu_variants) ? entry.day_menu_variants : [];
      const kcalVariants = variants
        .map((variant) => (isRecord(variant) && typeof variant.calories === "number" ? variant.calories : null))
        .filter((value): value is number => value !== null);
      const imageUrls = isRecord(entry.image_urls) ? entry.image_urls : {};
      return {
        dayMenuId: String(entry.id ?? entry.slug ?? ""),
        slug: String(entry.slug ?? ""),
        title: String(entry.title ?? entry.slug ?? ""),
        imageUrl:
          typeof imageUrls.medium === "string"
            ? imageUrls.medium
            : typeof imageUrls.large === "string"
              ? imageUrls.large
              : undefined,
        kcalVariants: Array.from(new Set(kcalVariants)).sort((a, b) => a - b),
      };
    })
    .filter((value): value is GoldLinkedDayMenuView => value !== null && value.dayMenuId.length > 0);

const collectTags = (value: unknown): string[] => {
  if (!isRecord(value)) {
    return [];
  }

  const tags: string[] = [];
  for (const entries of Object.values(value)) {
    if (!Array.isArray(entries)) {
      continue;
    }
    for (const entry of entries) {
      if (!isRecord(entry)) {
        continue;
      }
      const label = typeof entry.title === "string"
        ? entry.title
        : typeof entry.name === "string"
          ? entry.name
          : typeof entry.slug === "string"
            ? entry.slug
            : "";
      if (label.trim().length > 0) {
        tags.push(label.trim());
      }
    }
  }
  return Array.from(new Set(tags));
};

export interface NormalizePgRecipeOptions {
  fallbackImageUrl?: string;
  sourceUrl?: string;
  importedAt?: string;
}

export const normalizePgRecipePayload = (
  raw: unknown,
  options?: NormalizePgRecipeOptions,
): RecipeView => {
  const data = isRecord(raw) && isRecord(raw.data) ? raw.data : isRecord(raw) ? raw : {};

  const ingredientsHtml = typeof data.ingredients === "string" ? data.ingredients : "";
  const intro = typeof data.intro === "string" ? stripHtml(data.intro) : undefined;
  const steps = Array.isArray(data.steps) ? normalizeTextSteps(data.steps, "stap") : [];
  const tips = Array.isArray(data.tips) ? normalizeTips(data.tips) : [];
  const prepTimes = Array.isArray(data.preparation_times)
    ? normalizePreparationTimes(data.preparation_times)
    : [];
  const nutrition = Array.isArray(data.nutrients) ? normalizeNutrition(data.nutrients) : [];
  const linkedDayMenus = Array.isArray(data.LinkedDayMenus)
    ? normalizeLinkedDayMenus(data.LinkedDayMenus)
    : [];
  const tags = collectTags(data.tags);

  const imageUrls = isRecord(data.image_urls) ? data.image_urls : {};
  const imageUrl =
    typeof imageUrls.medium === "string"
      ? imageUrls.medium
      : typeof imageUrls.large === "string"
        ? imageUrls.large
        : options?.fallbackImageUrl;

  return {
    recipeId: String(data.slug ?? data.id ?? ""),
    slug: typeof data.slug === "string" ? data.slug : undefined,
    name: String(data.title ?? data.slug ?? data.id ?? "Onbekend recept"),
    imageUrl,
    kcal: typeof data.computed_kcal === "number" ? data.computed_kcal : undefined,
    ingredients: ingredientsHtml ? normalizeIngredientLines(ingredientsHtml) : undefined,
    steps: steps.length > 0 ? steps : undefined,
    intro,
    ingredientsRelatesTo:
      typeof data.ingredients_relates_to === "string" ? data.ingredients_relates_to : undefined,
    nutrientsRelatesTo:
      typeof data.nutrients_relates_to === "string" ? data.nutrients_relates_to : undefined,
    prepTimes: prepTimes.length > 0 ? prepTimes : undefined,
    tips: tips.length > 0 ? tips : undefined,
    nutrition: nutrition.length > 0 ? nutrition : undefined,
    linkedDayMenus: linkedDayMenus.length > 0 ? linkedDayMenus : undefined,
    tags: tags.length > 0 ? tags : undefined,
    importedAt: options?.importedAt,
    sourceUrl: options?.sourceUrl,
  };
};
