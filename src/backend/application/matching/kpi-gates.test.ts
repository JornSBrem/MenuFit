import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMatchingKpiGates } from "./kpi-gates.ts";

test("kpi gates pass when metrics satisfy thresholds", () => {
  const result = evaluateMatchingKpiGates({
    top1: 0.75,
    top3: 0.9,
    reviewRate: 0.2,
    noMatchRate: 0.08,
  });

  assert.equal(result.passed, true);
  assert.equal(result.checks.every((check) => check.passed), true);
});

test("kpi gates fail when one or more metrics violate thresholds", () => {
  const result = evaluateMatchingKpiGates({
    top1: 0.65,
    top3: 0.89,
    reviewRate: 0.3,
    noMatchRate: 0.07,
  });

  assert.equal(result.passed, false);
  assert.equal(result.checks.find((check) => check.key === "top1")?.passed, false);
  assert.equal(result.checks.find((check) => check.key === "reviewRate")?.passed, false);
});
