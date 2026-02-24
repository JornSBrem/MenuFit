export type SharedMatchPath = "reconcile" | "picnic";

export interface SharedMatchCandidate {
  candidateId: string;
  label: string;
  canonicalLabel?: string;
  pathBonus?: number;
}

export interface SharedScoreBreakdown {
  tokenOverlap: number;
  exactMatchBonus: number;
  firstTokenBonus: number;
  baseScore: number;
  pathBonus: number;
  finalScore: number;
}

export interface SharedRankedCandidate {
  candidate: SharedMatchCandidate;
  breakdown: SharedScoreBreakdown;
}

export interface SharedMatchPolicy {
  highConfidenceMin: number;
  autoAcceptMin: number;
  candidateMax: number;
}

export interface RankCandidatesOptions {
  path?: SharedMatchPath;
  applyPathBonuses?: boolean;
  policy?: Partial<SharedMatchPolicy>;
}

export const DEFAULT_SHARED_MATCH_POLICY: SharedMatchPolicy = {
  highConfidenceMin: 0.85,
  autoAcceptMin: 0.7,
  candidateMax: 20,
};

const clampScore = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
};

export const normalizeMatchText = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

export const tokenizeMatchText = (value: string): string[] =>
  normalizeMatchText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);

export const computeTokenOverlap = (input: string, candidate: string): number => {
  const inputTokens = Array.from(new Set(tokenizeMatchText(input)));
  const candidateTokens = new Set(tokenizeMatchText(candidate));
  if (inputTokens.length === 0 || candidateTokens.size === 0) {
    return 0;
  }

  const overlapCount = inputTokens.filter((token) => candidateTokens.has(token)).length;
  return clampScore(overlapCount / inputTokens.length);
};

const getFirstTokenBonus = (input: string, candidate: string): number => {
  const firstToken = tokenizeMatchText(input)[0];
  if (!firstToken) {
    return 0;
  }
  return tokenizeMatchText(candidate).includes(firstToken) ? 0.05 : 0;
};

const getExactMatchBonus = (input: string, candidate: string): number =>
  normalizeMatchText(input) === normalizeMatchText(candidate) ? 0.1 : 0;

export const scoreCandidateCanonical = (
  input: string,
  candidate: SharedMatchCandidate,
  path: SharedMatchPath = "reconcile",
  applyPathBonuses = true,
): SharedScoreBreakdown => {
  const candidateText = candidate.canonicalLabel ?? candidate.label;
  const tokenOverlap = computeTokenOverlap(input, candidateText);
  const exactMatchBonus = getExactMatchBonus(input, candidateText);
  const firstTokenBonus = getFirstTokenBonus(input, candidateText);
  const baseScore = clampScore(tokenOverlap * 0.85 + exactMatchBonus + firstTokenBonus);

  const pathBonus =
    applyPathBonuses && path === "picnic" ? clampScore(candidate.pathBonus ?? 0) : 0;
  const finalScore = clampScore(baseScore + pathBonus);

  return {
    tokenOverlap,
    exactMatchBonus,
    firstTokenBonus,
    baseScore,
    pathBonus,
    finalScore,
  };
};

export const resolveSharedMatchPolicy = (
  overrides?: Partial<SharedMatchPolicy>,
): SharedMatchPolicy => {
  const merged = {
    ...DEFAULT_SHARED_MATCH_POLICY,
    ...overrides,
  };

  return {
    highConfidenceMin: clampScore(merged.highConfidenceMin),
    autoAcceptMin: clampScore(merged.autoAcceptMin),
    candidateMax: Math.max(1, Math.floor(merged.candidateMax)),
  };
};

export const rankCandidatesShared = (
  input: string,
  candidates: SharedMatchCandidate[],
  options?: RankCandidatesOptions,
): SharedRankedCandidate[] => {
  const path = options?.path ?? "reconcile";
  const applyPathBonuses = options?.applyPathBonuses ?? true;
  const policy = resolveSharedMatchPolicy(options?.policy);

  const ranked = candidates.map((candidate) => ({
    candidate,
    breakdown: scoreCandidateCanonical(input, candidate, path, applyPathBonuses),
  }));

  ranked.sort((left, right) => {
    if (right.breakdown.finalScore !== left.breakdown.finalScore) {
      return right.breakdown.finalScore - left.breakdown.finalScore;
    }
    if (right.breakdown.baseScore !== left.breakdown.baseScore) {
      return right.breakdown.baseScore - left.breakdown.baseScore;
    }
    return left.candidate.label.localeCompare(right.candidate.label);
  });

  return ranked.slice(0, policy.candidateMax);
};
