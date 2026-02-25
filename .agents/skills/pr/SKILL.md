---
name: pr
description: 'Create a GitHub Pull Request for the current branch using gh CLI.'
---

# pr Skill

Creates a PR for the current branch with a structured title and body derived from recent commits.

## Prerequisites

- `gh` CLI installed and authenticated (`brew install gh && gh auth login`)
- Branch already pushed to remote

## Steps

1. **Check prerequisites**:
   ```bash
   gh auth status
   git status
   git log main..HEAD --oneline
   ```

2. **Build PR title** from the WI IDs in recent commits:
   - Format: `feat: WI-NNN[/NNN...] <short description>`
   - Max 70 characters

3. **Build PR body** — always use this structure:
   ```markdown
   ## Summary
   - WI-NNN — <one-line description>
   - WI-NNN — <one-line description>

   ## Test plan
   - [ ] Run full test suite: `find src/backend src/admin-web -name '*.test.ts' | xargs node --test --experimental-strip-types`
   - [ ] Verify all N tests pass
   - [ ] Review workitems.md — confirm all WIs marked DONE

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   ```

4. **Create PR**:
   ```bash
   gh pr create --title "..." --body "..."
   ```

5. **Return PR URL** to user

## Notes

- If `gh` is not installed: push branch and print the GitHub URL for manual PR creation
- Never force-push to main
- If the branch already has an open PR: use `gh pr view` instead
