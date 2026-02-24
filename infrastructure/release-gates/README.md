# Release Gates

KPI release gate checker for matching quality:

- `check-kpi-gates.ts`: validates Top-1 / Top-3 / Review-rate / No-match-rate thresholds.
- `sample-metrics.json`: passing sample input used by CI baseline.

Run locally:

```bash
node --experimental-strip-types infrastructure/release-gates/check-kpi-gates.ts infrastructure/release-gates/sample-metrics.json
```
