import assert from "node:assert/strict";
import test from "node:test";

import {
  computeTokenOverlap,
  rankCandidatesShared,
  scoreCandidateCanonical,
  type SharedMatchCandidate,
} from "./shared-core.ts";

const CANDIDATES: SharedMatchCandidate[] = [
  {
    candidateId: "cand-1",
    label: "Volkoren pasta",
    pathBonus: 0.03,
  },
  {
    candidateId: "cand-2",
    label: "Pasta volkoren bio",
    pathBonus: 0.04,
  },
  {
    candidateId: "cand-3",
    label: "Witte rijst",
    pathBonus: 0.02,
  },
];

test("computeTokenOverlap returns deterministic directional overlap", () => {
  assert.equal(computeTokenOverlap("volkoren pasta", "volkoren pasta"), 1);
  assert.equal(computeTokenOverlap("volkoren pasta", "pasta"), 0.5);
  assert.equal(computeTokenOverlap("volkoren pasta", "rijst"), 0);
});

test("rankCandidatesShared sorts by final score and applies candidate limit", () => {
  const ranked = rankCandidatesShared("volkoren pasta", CANDIDATES, {
    path: "reconcile",
    policy: { candidateMax: 2 },
  });

  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].candidate.candidateId, "cand-1");
  assert.ok(ranked[0].breakdown.finalScore >= ranked[1].breakdown.finalScore);
});

test("parity: reconcile and picnic produce equal base scores for same input/candidates", () => {
  const input = "volkoren pasta";

  const reconcileRanked = rankCandidatesShared(input, CANDIDATES, {
    path: "reconcile",
    applyPathBonuses: true,
    policy: { candidateMax: 10 },
  });
  const picnicRanked = rankCandidatesShared(input, CANDIDATES, {
    path: "picnic",
    applyPathBonuses: true,
    policy: { candidateMax: 10 },
  });

  const reconcileBaseById = new Map(
    reconcileRanked.map((row) => [row.candidate.candidateId, row.breakdown.baseScore]),
  );
  const picnicBaseById = new Map(
    picnicRanked.map((row) => [row.candidate.candidateId, row.breakdown.baseScore]),
  );

  assert.equal(reconcileBaseById.size, picnicBaseById.size);
  for (const candidate of CANDIDATES) {
    assert.equal(reconcileBaseById.get(candidate.candidateId), picnicBaseById.get(candidate.candidateId));
  }

  const reconcileDirect = scoreCandidateCanonical(input, CANDIDATES[0], "reconcile", true);
  const picnicDirect = scoreCandidateCanonical(input, CANDIDATES[0], "picnic", true);
  assert.equal(reconcileDirect.baseScore, picnicDirect.baseScore);
});
