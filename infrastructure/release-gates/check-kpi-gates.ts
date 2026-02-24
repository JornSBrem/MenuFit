import { readFileSync } from "node:fs";

import {
  DEFAULT_MATCHING_KPI_THRESHOLDS,
  evaluateMatchingKpiGates,
  type MatchingKpiMetrics,
  type MatchingKpiThresholds,
} from "../../src/backend/application/matching/kpi-gates.ts";

interface GateInput {
  metrics: MatchingKpiMetrics;
  thresholds?: MatchingKpiThresholds;
}

const formatCheck = (check: ReturnType<typeof evaluateMatchingKpiGates>["checks"][number]): string =>
  `${check.key}: ${check.metric.toFixed(4)} ${check.comparator} ${check.threshold.toFixed(4)} => ${
    check.passed ? "PASS" : "FAIL"
  }`;

const main = (): number => {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node --experimental-strip-types infrastructure/release-gates/check-kpi-gates.ts <metrics.json>");
    return 2;
  }

  let parsed: GateInput;
  try {
    parsed = JSON.parse(readFileSync(inputPath, "utf8")) as GateInput;
  } catch (error) {
    console.error(`Could not read/parse metrics input: ${String(error)}`);
    return 2;
  }

  const thresholds = parsed.thresholds ?? DEFAULT_MATCHING_KPI_THRESHOLDS;
  const result = evaluateMatchingKpiGates(parsed.metrics, thresholds);

  console.log("KPI Gate Evaluation");
  for (const check of result.checks) {
    console.log(formatCheck(check));
  }
  console.log(`Overall: ${result.passed ? "PASS" : "FAIL"}`);

  return result.passed ? 0 : 1;
};

process.exitCode = main();
