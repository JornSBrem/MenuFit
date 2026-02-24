---
description: 'Architecture guardrails for MenuFit modules, boundaries, and shared contracts.'
applyTo: 'src/backend/**,src/admin-web/**,src/ios-user-app/**,src/shared/**,infrastructure/**'
---

# MenuFit Architecture Guardrails

## Separation of Responsibilities

- Keep business rules in backend/shared logic, not in UI layers.
- Keep admin-only behavior out of `src/ios-user-app/`.
- Keep user-session logic out of admin-only modules.
- Keep shared contracts in `src/shared/` and treat them as source of truth.

## Data and Contract Discipline

- Prefer explicit schemas and typed DTOs for cross-layer communication.
- Any API contract change must update backend and consumers in the same task.
- Avoid duplicate mapping logic; reuse shared mappers and validators.

## Change Strategy

- Prefer incremental, reversible changes.
- Avoid introducing new frameworks until current module baselines are stable.
- Add or update tests for changed domain behavior.

## Operational Quality

- Add structured logs for state transitions and failures.
- Use configuration for environment-dependent values.
- Keep infrastructure changes aligned with code changes that require them.
