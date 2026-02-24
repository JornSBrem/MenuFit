# Domain Layer

Domain code is deterministic and side-effect free.

- Contains medallion rules, quantity logic, matching policy, cart planning.
- Matching core lives in `domain/matching` and is reused by reconcile/picnic paths.
- Must not import HTTP clients, DB drivers, or UI code.
