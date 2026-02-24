# Shared Matching Core Design (weekmenu↔boodschappenlijst + boodschappenlijst↔Picnic)

## Why

We currently have matching logic in two places:

1. `weekmenu ↔ boodschappenlijst` (PDF/computed reconcile, server-side)
2. `boodschappenlijst ↔ Picnic` (product matching engine)

This causes drift risk: same ingredient text can produce different canonicalization, scores, thresholds, and outcomes depending on the path.

## Goal

Introduce **one shared matching core** that is reused by both paths, so matching behavior is consistent and measurable.

## Scope (Phase 0 / skeleton now)

This document + initial module establishes:

- common match types
- common score breakdown fields
- common threshold policy structure
- common token-overlap scoring helpers
- path-aware ranking entrypoint

No runtime behavior change yet; existing flows remain intact until integration phases.

## Target Architecture

- `src/matching/sharedCore.ts`
  - canonical shared types (`SharedMatchCandidate`, `SharedMatchDecision`, `SharedScoreBreakdown`)
  - deterministic scoring helpers (`computeTokenOverlap`, `scoreCandidateCanonical`)
  - reusable ranker (`rankCandidatesShared`)

- Existing path adapters (next steps):
  - `server.ts` PDF reconcile path:
    - migrate `matchPdfItemToGrocery(...)` and `annotatePdfGroceriesList(...)` selection to shared ranker
  - `picnic/productMatch.ts` path:
    - reuse same canonical score + decision policy before/after Picnic retrieval

## Decision Policy (single source of truth)

Use one threshold policy for both paths:

- `highConfidenceMin`
- `autoAcceptMin`
- `candidateMax`

Path-specific extras are allowed, but only as additive modifiers (e.g., Picnic preference bonuses), not separate base matching logic.

## Evaluation & Parity

Add parity tests to enforce this invariant:

> Given identical canonical input and candidate set, both matching paths produce the same base score and same selected candidate.

Initial KPI set:

- Top-1 accuracy
- Top-3 recall
- no-match rate
- manual review rate

## Rollout Plan

1. Shadow mode behind feature flag
   - compute shared result next to current result
   - log diffs only
2. Path-by-path cutover
   - first weekmenu↔boodschappenlijst
   - then boodschappenlijst↔Picnic
3. Remove legacy duplicate scoring code after parity is stable

## Integration Notes

Potential integration points already present:

- `src/web/server.ts`
  - `matchPdfItemToGrocery(...)`
  - `annotatePdfGroceriesList(...)`
- `src/picnic/productMatch.ts`
  - `scoreProducts(...)`
  - `isHighConfidenceMatch(...)`

## Non-goals (for now)

- Embedding retrieval implementation details
- LLM reranker implementation details
- review-queue API/UI details

Those are tracked in `WORKITEMS.md` under Hybrid matching v2 phases.
