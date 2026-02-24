# Test Strategy and Release Gates (WI-013)

## Test Suites

1. Unit tests
- Domain/application/integration helpers (`*.test.ts`) for deterministic logic.

2. Integration tests
- Route/service interaction tests under `src/backend/interfaces/http/**` and `src/backend/application/**`.

3. E2E smoke test
- `src/backend/tests/e2e-smoke.test.ts`
- Covers baseline flow: week transform -> match -> cart sync -> system operation.

## CI Execution

Workflow: `.github/workflows/ci.yml`

Steps:
1. Run unit + integration tests (`find src/backend -name '*.test.ts' ! -name 'e2e-smoke.test.ts'`).
2. Run e2e smoke test.
3. Evaluate KPI release gates from metrics JSON.
4. Run live contract validation against configured external backend endpoints.

## KPI Release Gates

Default thresholds:
- Top-1 >= 0.70
- Top-3 >= 0.88
- Review-rate <= 0.25
- No-match-rate <= 0.10

Implementation:
- Evaluator: `src/backend/application/matching/kpi-gates.ts`
- Checker CLI: `infrastructure/release-gates/check-kpi-gates.ts`
- CI sample input: `infrastructure/release-gates/sample-metrics.json`
- Live contract checker: `infrastructure/release-gates/check-live-contracts.ts`

CI fails when any KPI gate is violated.
