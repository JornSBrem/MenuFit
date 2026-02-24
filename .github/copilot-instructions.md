# MenuFit Copilot Instructions

Apply these rules for all MenuFit work.

## Product Boundaries

- `src/backend/`: API, jobs, domain orchestration.
- `src/admin-web/`: operator flows and system management.
- `src/ios-user-app/`: end-user app flow (Swift/SwiftUI).
- `src/shared/`: contracts, shared types, shared validation.
- `infrastructure/`: deployment and environment config.

Do not mix responsibilities across these boundaries.

## Execution Workflow

For non-trivial requests:

1. Create or update a plan in `.copilot-tracking/plans/`.
2. Implement changes in small, reviewable units.
3. Record what changed in `.copilot-tracking/changes/`.
4. Keep documentation and contracts in sync with code.

## Quality Baseline

- Prefer clear modular code over large mixed files.
- Keep domain logic deterministic and testable.
- Use explicit contracts between backend/admin/iOS/shared.
- Add tests for core rules before or together with implementation.
- Never hardcode secrets or environment-specific credentials.

## Safety and Change Control

- No destructive file or data operations without explicit user confirmation.
- Keep commits focused and scoped to one intent.
- Call out assumptions when requirements are ambiguous.
