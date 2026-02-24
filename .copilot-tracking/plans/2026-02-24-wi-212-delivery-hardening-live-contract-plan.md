<!-- markdownlint-disable-file -->
# Plan: WI-212 Delivery hardening: deploy wiring, branch protection en live contract-validatie

## Scope

Harden delivery flow with explicit repository guardrails and live release checks:
- add branch-protection policy-as-code artifact and apply script for `main`
- document required protection rules/status checks for production merge/release
- add live endpoint contract validation checker against real backend base URL
- wire live contract checker into CI/release checks with required env/secrets handling

Out of scope:
- actually executing GitHub API mutations from this local session (requires org/repo token at runtime)
- full cloud deployment provisioning (covered by later infra-specific workitems)

## Docs Used

- `docs/TEST_STRATEGY_AND_RELEASE_GATES.md`
- `docs/PG_ENDPOINT_CONTRACT.md`
- `infrastructure/release-gates/README.md`

## Success Criteria

- [x] Branch protection policy is captured in repo and has an executable apply path.
- [x] CI/release checks include live contract validation against configured external endpoints.
- [x] Delivery hardening docs describe setup prerequisites, secrets, and required checks.

## Tasks

### Phase 1: Branch protection wiring

- [x] Add branch protection policy JSON for `main` with required status checks and review rules.
- [x] Add apply script/documentation for GitHub API branch protection updates.

### Phase 2: Live contract validation wiring

- [x] Add live contract checker script for key API routes (week/groceries/system/match queue).
- [x] Wire checker into CI workflow as release-gate step with env-driven config.

### Phase 3: Validation and tracking

- [x] Run local validation for new scripts in sample/skip mode.
- [x] Update tracking artifacts (`plans`, `changes`, `workitems`) after implementation.
