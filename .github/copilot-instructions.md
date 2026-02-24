# MenuFit Copilot Bootstrap

Use this lightweight baseline in every session:

1. Start from `workitems/workitems.md`.
2. Plan in `.copilot-tracking/plans/` before non-trivial changes.
3. Implement only within module boundaries:
   - `src/backend/`
   - `src/admin-web/`
   - `src/ios-user-app/`
   - `src/shared/`
   - `infrastructure/`
4. Track completed work in `.copilot-tracking/changes/`.
5. Keep contracts/tests/docs aligned with changed behavior.
6. Add discovered bugs/features back into `workitems/workitems.md`.

Detailed rules live in `.github/instructions/*.instructions.md`.
