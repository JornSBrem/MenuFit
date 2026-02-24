# Shared Matching Core

Single source of truth for deterministic base matching logic:

- shared candidate/score/policy types
- token overlap and canonical score helpers
- reusable ranker for reconcile and picnic paths

Path-specific behavior must remain additive (for example path bonus) and must not alter base score math.
