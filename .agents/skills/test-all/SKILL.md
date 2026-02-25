---
name: test-all
description: 'Run the full MenuFit test suite (backend + admin-web) in one command.'
---

# test-all Skill

Run this skill to execute all unit and integration tests across `src/backend` and `src/admin-web`.

## When to Use

- Before committing a workitem
- After making cross-module changes
- To verify nothing is broken after a refactor

## Steps

1. Run the full test suite:

```bash
find src/backend src/admin-web -name '*.test.ts' ! -name 'e2e-smoke.test.ts' -print0 \
  | xargs -0 node --test --experimental-strip-types 2>&1
```

2. Report:
   - Total tests, pass count, fail count
   - List any failing test files with error summary
   - If all pass: confirm ✅ ready to commit

## Notes

- E2E smoke tests (`e2e-smoke.test.ts`) are excluded — those require a live backend
- iOS tests require Xcode/Simulator — not covered here
- Run from repo root (worktree root)
