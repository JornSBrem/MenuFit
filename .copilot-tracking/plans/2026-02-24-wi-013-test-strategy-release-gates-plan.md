<!-- markdownlint-disable-file -->
# Plan: WI-013 Test strategy and release gates baseline

## Scope

Implement a baseline quality gate pipeline:
- structured test strategy artifacts (unit/integration/e2e smoke suites)
- CI workflow that executes all baseline suites
- KPI release gate evaluator for top-1/top-3/review-rate/no-match-rate thresholds
- measurable gate report output and CI failure on KPI gate violations

Out of scope:
- full mobile UI test automation via Xcode simulator
- production telemetry ingestion pipeline for KPI metrics
- branch protection policy setup in GitHub UI

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/MATCHING_SHARED_CORE_DESIGN.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Unit/integration/e2e smoke suites are runnable in CI workflow.
- [x] KPI gates for top-1/top-3/review-rate/no-match-rate are machine-evaluable.
- [x] CI workflow fails when KPI thresholds are violated.

## Tasks

### Phase 1: KPI gate evaluator

- [x] Add KPI threshold and metrics contracts plus gate evaluator.
- [x] Add tests for pass/fail gate outcomes.

### Phase 2: CI and smoke suite wiring

- [x] Add CI workflow that runs unit/integration/e2e smoke tests.
- [x] Add CI step to run KPI gate checker from metrics JSON input.

### Phase 3: Validation and tracking

- [x] Add documentation for test strategy and gate usage.
- [x] Update WI-013 tracking files and workitem status.
