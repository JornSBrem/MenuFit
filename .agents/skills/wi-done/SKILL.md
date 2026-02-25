---
name: wi-done
description: 'Mark a MenuFit workitem as DONE: update workitems.md, create tracking files, commit and push.'
---

# wi-done Skill

Completes the full DONE ceremony for a workitem: tracking files, workitems.md update, commit, push.

## When to Use

After finishing implementation and all tests pass for a workitem.

## Steps

1. **Verify tests pass** — run test-all skill or the relevant test file(s)

2. **Update `workitems/workitems.md`**:
   - Change `[ ]` → `[x]` on the workitem line
   - Change `status:TODO` → `status:DONE`
   - Move the entry to the `## Done (recent additions)` section

3. **Create plan file** (if not already present):
   - Path: `.copilot-tracking/plans/YYYY-MM-DD-wi-NNN-<slug>-plan.md`
   - Use template from `.copilot-tracking/templates/implementation-plan.template.md`
   - Mark all tasks `[x]`

4. **Create changes file** (if not already present):
   - Path: `.copilot-tracking/changes/YYYY-MM-DD-wi-NNN-<slug>-changes.md`
   - Use template from `.copilot-tracking/templates/changes.template.md`
   - List all Added / Modified / Removed files with one-line descriptions

5. **Check out-of-scope items** from the plan:
   - Convert any still-relevant out-of-scope bullets to new `TODO` workitems in `workitems/workitems.md`
   - Avoid duplicates

6. **Commit**:
   ```
   feat: complete WI-NNN <short title>

   <2-3 line summary of what was built and why>

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   ```

7. **Push** to current branch

## Notes

- One commit per workitem (not per file)
- Tracking files should be included in the same commit as the implementation
- If `gh` is available: optionally create a PR after push
