# Domain Layer

Domain code is deterministic and side-effect free.

- Contains medallion rules, quantity logic, matching policy, cart planning.
- Must not import HTTP clients, DB drivers, or UI code.
