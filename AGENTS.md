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
5. Convert out-of-scope immediately: after marking a workitem DONE, review that plan's `Out of scope` section and create new `TODO` workitems in `workitems/workitems.md` for each still-relevant item before continuing.
6. Commit and push
7. start executing next item on workitems.md in `workitems/workitems.md`, start at step 1 of 3) Execution Flow in `AGENTS.md`
8. when no more items available on workitems.md in `workitems/workitems.md` add new items based on projectdocs and builded code.

### 3.1) Out-of-scope Conversion Rule (Mandatory)

- Trigger: every time a workitem is moved to `Done`.
- Source: corresponding plan file in `.copilot-tracking/plans/`.
- Action: transform each valid out-of-scope bullet into a new workitem (`type:feature|bug|chore|spike`, priority, context, acceptance).
- De-duplication: do not add duplicates; update existing matching workitem if already present.
- Scope discipline: only add items that are still relevant to current architecture/docs.

## 4) Context Loading (Only What You Need)

- `docs/APP_V3_MEDALLION_BLUEPRINT.md` for product/architecture.
- `docs/PG_ENDPOINT_CONTRACT.md` for endpoint contracts.
- `docs/MATCHING_SHARED_CORE_DESIGN.md` for matching logic.
- `docs/REFACTOR_SIMPLIFICATION_PLAN.md` for legacy simplification.
- `docs/best_practices.md` for coding standards.

If docs conflict with code: add a bug/chore in `workitems/workitems.md`.

## 5) Tracking Discipline (Mandatory)

Every workitem MUST have matching files before the commit:
- **Plan**: `.copilot-tracking/plans/YYYY-MM-DD-wi-NNN-<slug>-plan.md`
- **Changes**: `.copilot-tracking/changes/YYYY-MM-DD-wi-NNN-<slug>-changes.md`

Use templates in `.copilot-tracking/templates/`. Include both files in the same commit as the implementation. Use the `wi-done` skill to automate this ceremony.

## 6) iOS Workitems

Workitems targeting `src/ios-user-app/` require Xcode + Simulator for test execution. When working on iOS items:
- Write the Swift/SwiftUI code as normal
- Note in the changes file: `⚠️ requires-xcode — runtime tests not locally verified`
- CI (`ios-ui-smoke` job) validates on push via GitHub Actions

## 7) Backlog Discipline

When moving a workitem to DONE:
1. Change `[ ]` → `[x]` and `status:TODO` → `status:DONE` on the existing backlog entry
2. Add the same entry to `## Done (recent additions)`
3. No stale `status:TODO` duplicates — one canonical entry per WI

## 8) Available Skills

Use these skills during the session:
- `.agents/skills/test-all/SKILL.md` — run full test suite before committing
- `.agents/skills/wi-done/SKILL.md` — complete DONE ceremony (tracking + commit + push)
- `.agents/skills/pr/SKILL.md` — create GitHub PR via `gh` CLI
- `.agents/skills/menufit-workflow/SKILL.md` — general workflow guardrails

## 9) Source of Detailed Rules

- `.github/copilot-instructions.md`
- `.github/instructions/*.instructions.md`
- `.github/agents/*.agent.md` (GitHub Copilot / VS Code only — not used in Claude Code sessions)
- `.agents/skills/*/SKILL.md` (Claude Code skills — active in this session)
