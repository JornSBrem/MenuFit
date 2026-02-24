---
name: menufit-workflow
description: 'Structured MenuFit delivery workflow for planning, implementation, and review across backend, admin web, iOS app, shared contracts, and infrastructure.'
---

# MenuFit Workflow Skill

Use this skill when a task affects MenuFit product code and needs a controlled execution flow.

## When to Use

- New feature implementation.
- Multi-file refactor.
- API/contract changes across modules.
- Infrastructure changes tied to product behavior.

## Workflow

1. Plan
- Create or update a plan file in `.copilot-tracking/plans/`.
- Define tasks, impacted files, risks, and validation steps.

2. Implement
- Execute one task at a time.
- Respect module boundaries:
  - `src/backend/`
  - `src/admin-web/`
  - `src/ios-user-app/`
  - `src/shared/`
  - `infrastructure/`

3. Track
- Record completed work in `.copilot-tracking/changes/`.
- Keep entries file-specific and concise.

4. Review
- Verify behavior, regressions, and contract compatibility.
- Confirm tests and key checks were run or explicitly note gaps.

## Guardrails

- Keep shared contracts authoritative in `src/shared/`.
- Do not blend admin-only and end-user flows.
- Keep changes incremental and reversible.
- Do not introduce secrets in source files.
