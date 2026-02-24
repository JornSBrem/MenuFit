# MenuFit Agent Setup

This repository uses a structured AI workflow inspired by `github/awesome-copilot`.

## Scope

- Build product code under:
  - `src/backend/`
  - `src/admin-web/`
  - `src/ios-user-app/`
  - `src/shared/`
  - `infrastructure/`
- Keep planning artifacts in `.copilot-tracking/`.

## Operating Mode

Use this sequence for all non-trivial work:

1. Plan in `.copilot-tracking/plans/`
2. Implement in source folders
3. Review before merge
4. Track delivered changes in `.copilot-tracking/changes/`

## Agent Files

- `.github/agents/planner.agent.md`
- `.github/agents/implementer.agent.md`
- `.github/agents/reviewer.agent.md`

## Instructions

- `.github/copilot-instructions.md`
- `.github/instructions/menufit-architecture.instructions.md`
- `.github/instructions/menufit-taskflow.instructions.md`
- `.github/instructions/menufit-backend-typescript.instructions.md`
- `.github/instructions/menufit-admin-web-react.instructions.md`
- `.github/instructions/menufit-ios-swiftui.instructions.md`

## Skills

- `.agents/skills/menufit-workflow/SKILL.md`
