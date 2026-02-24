# MenuFit Session Bootstrap (Token-Optimized)

## 1) Start Here (Mandatory)

1. Read `workitems/workitems.md`.
2. Work only on listed workitems.
3. When done: mark `[x]` and move item to `Done`.
4. If you find a bug: add a `type:bug` workitem.
5. If you find a new feature: add a `type:feature` workitem.

## 2) Workitem Rules

- Format: `WI-### | type:<feature|bug|chore|spike> | priority:<P0-P3> | status:<TODO|IN-PROGRESS|DONE> | title:<...>`.
- Include `context` and `acceptance` before starting implementation.
- Keep exactly one `IN-PROGRESS` item at a time.

## 3) Execution Flow

1. Plan: `.copilot-tracking/plans/`
2. Implement: `src/backend|src/admin-web|src/ios-user-app|src/shared|infrastructure`
3. Review: use reviewer workflow
4. Track: `.copilot-tracking/changes/`
5. Commit and push
6. start executing next item on workitems.md in `workitems/workitems.md`, start at step 1 of 3) Execution Flow in `AGENTS.md`

## 4) Context Loading (Only What You Need)

- `docs/APP_V3_MEDALLION_BLUEPRINT.md` for product/architecture.
- `docs/PG_ENDPOINT_CONTRACT.md` for endpoint contracts.
- `docs/MATCHING_SHARED_CORE_DESIGN.md` for matching logic.
- `docs/REFACTOR_SIMPLIFICATION_PLAN.md` for legacy simplification.
- `docs/best_practices.md` for coding standards.

If docs conflict with code: add a bug/chore in `workitems/workitems.md`.

## 5) Source of Detailed Rules

- `.github/copilot-instructions.md`
- `.github/instructions/*.instructions.md`
- `.github/agents/*.agent.md`
- `.agents/skills/menufit-workflow/SKILL.md`
