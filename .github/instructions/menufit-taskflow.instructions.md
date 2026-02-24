---
description: 'Structured planning and implementation flow for MenuFit using plan, details, and changes tracking files.'
applyTo: '.copilot-tracking/plans/**,.copilot-tracking/details/**,.copilot-tracking/changes/**'
---

# MenuFit Task Flow

Use this workflow for any feature or refactor that affects multiple files.

## Required Process

1. Read the full plan file before implementation.
2. If needed, add detail notes in `.copilot-tracking/details/`.
3. Implement tasks one by one in plan order.
4. After each completed task:
   - Mark it done in the plan.
   - Add a short entry to the related changes file.
5. Complete with a release summary when all plan tasks are done.

## Tracking Rules

- One plan file per feature or refactor.
- One matching changes file per plan.
- Keep entries concise and file-path specific.
- Note any intentional deviations from plan with reason.
