# Silver Transform Baseline

WI-003 silver pipeline modules:

- `normalization.ts`: ingredient canonicalization and quantity normalization.
- `reconcile.ts`: computed-vs-PDF reconcile status and quality event generation via shared matching overlap helpers.
- `transformer.ts`: deterministic bronze-like payload -> silver row sets.
- `reprocess.ts`: rerun transforms for an explicit `transformVersion`, optionally persisting outputs.
- `types.ts`: typed row models for silver output tables.

This baseline is designed for deterministic transformation and reprocessability.
