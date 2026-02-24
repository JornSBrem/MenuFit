export interface MatchingKpiMetrics {
  top1: number;
  top3: number;
  reviewRate: number;
  noMatchRate: number;
}

export interface MatchingKpiThresholds {
  top1Min: number;
  top3Min: number;
  reviewRateMax: number;
  noMatchRateMax: number;
}

export interface MatchingKpiGateCheck {
  key: "top1" | "top3" | "reviewRate" | "noMatchRate";
  metric: number;
  threshold: number;
  comparator: ">=" | "<=";
  passed: boolean;
}

export interface MatchingKpiGateResult {
  passed: boolean;
  checks: MatchingKpiGateCheck[];
}

export const DEFAULT_MATCHING_KPI_THRESHOLDS: MatchingKpiThresholds = {
  top1Min: 0.7,
  top3Min: 0.88,
  reviewRateMax: 0.25,
  noMatchRateMax: 0.1,
};

const clamp01 = (value: number): number => {
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

export const evaluateMatchingKpiGates = (
  metrics: MatchingKpiMetrics,
  thresholds: MatchingKpiThresholds = DEFAULT_MATCHING_KPI_THRESHOLDS,
): MatchingKpiGateResult => {
  const normalizedMetrics = {
    top1: clamp01(metrics.top1),
    top3: clamp01(metrics.top3),
    reviewRate: clamp01(metrics.reviewRate),
    noMatchRate: clamp01(metrics.noMatchRate),
  };

  const checks: MatchingKpiGateCheck[] = [
    {
      key: "top1",
      metric: normalizedMetrics.top1,
      threshold: thresholds.top1Min,
      comparator: ">=",
      passed: normalizedMetrics.top1 >= thresholds.top1Min,
    },
    {
      key: "top3",
      metric: normalizedMetrics.top3,
      threshold: thresholds.top3Min,
      comparator: ">=",
      passed: normalizedMetrics.top3 >= thresholds.top3Min,
    },
    {
      key: "reviewRate",
      metric: normalizedMetrics.reviewRate,
      threshold: thresholds.reviewRateMax,
      comparator: "<=",
      passed: normalizedMetrics.reviewRate <= thresholds.reviewRateMax,
    },
    {
      key: "noMatchRate",
      metric: normalizedMetrics.noMatchRate,
      threshold: thresholds.noMatchRateMax,
      comparator: "<=",
      passed: normalizedMetrics.noMatchRate <= thresholds.noMatchRateMax,
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
  };
};
