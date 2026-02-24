const DIACRITICS_REGEX = /[\u0300-\u036f]/g;
const MULTI_SPACE_REGEX = /\s+/g;

const SYNONYM_MAP: Record<string, string> = {
  lenteui: "bosui",
  ui: "uien",
  tomaatjes: "tomaat",
  aardappelen: "aardappel",
};

export type UnitFamily = "mass" | "volume" | "piece" | "other";

export interface NormalizedQuantity {
  normalizedAmount?: number;
  normalizedUnit?: string;
  unitFamily: UnitFamily;
  requiresReview: boolean;
}

const MASS_UNITS: Record<string, { factor: number; unit: string }> = {
  g: { factor: 1, unit: "g" },
  gram: { factor: 1, unit: "g" },
  gr: { factor: 1, unit: "g" },
  kg: { factor: 1000, unit: "g" },
};

const VOLUME_UNITS: Record<string, { factor: number; unit: string }> = {
  ml: { factor: 1, unit: "ml" },
  l: { factor: 1000, unit: "ml" },
};

const PIECE_UNITS = new Set(["stuk", "stuks", "teen", "plak"]);
const REVIEW_ONLY_UNITS = new Set(["el", "tl"]);

export const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(MULTI_SPACE_REGEX, " ")
    .trim();

export const canonicalizeIngredient = (value: string): string => {
  const normalized = normalizeText(value);
  return SYNONYM_MAP[normalized] ?? normalized;
};

export const normalizeQuantity = (amount: string | number | undefined, unit: string | undefined): NormalizedQuantity => {
  if (!amount || !unit) {
    return {
      unitFamily: "other",
      requiresReview: true,
    };
  }

  const numericAmount = typeof amount === "number" ? amount : Number(String(amount).replace(",", "."));
  if (!Number.isFinite(numericAmount)) {
    return {
      unitFamily: "other",
      requiresReview: true,
    };
  }

  const normalizedUnit = normalizeText(unit);
  const massInfo = MASS_UNITS[normalizedUnit];
  if (massInfo) {
    return {
      normalizedAmount: numericAmount * massInfo.factor,
      normalizedUnit: massInfo.unit,
      unitFamily: "mass",
      requiresReview: false,
    };
  }

  const volumeInfo = VOLUME_UNITS[normalizedUnit];
  if (volumeInfo) {
    return {
      normalizedAmount: numericAmount * volumeInfo.factor,
      normalizedUnit: volumeInfo.unit,
      unitFamily: "volume",
      requiresReview: false,
    };
  }

  if (PIECE_UNITS.has(normalizedUnit)) {
    return {
      normalizedAmount: numericAmount,
      normalizedUnit: "piece",
      unitFamily: "piece",
      requiresReview: false,
    };
  }

  if (REVIEW_ONLY_UNITS.has(normalizedUnit)) {
    return {
      normalizedAmount: numericAmount,
      normalizedUnit,
      unitFamily: "other",
      requiresReview: true,
    };
  }

  return {
    normalizedAmount: numericAmount,
    normalizedUnit,
    unitFamily: "other",
    requiresReview: true,
  };
};
