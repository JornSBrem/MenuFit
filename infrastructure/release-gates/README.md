# Release Gates

KPI release gate checker for matching quality:

- `check-kpi-gates.ts`: validates Top-1 / Top-3 / Review-rate / No-match-rate thresholds.
- `sample-metrics.json`: passing sample input used by CI baseline.
- `check-live-contracts.ts`: validates live `/api/v3/*` contract shape against configured base URL.

Run locally:

```bash
node --experimental-strip-types infrastructure/release-gates/check-kpi-gates.ts infrastructure/release-gates/sample-metrics.json
```

Live contracts (optional local run):

```bash
LIVE_CONTRACT_BASE_URL=https://backend.example.com \
LIVE_CONTRACT_AUTH_TOKEN=<optional-bearer-token> \
node --experimental-strip-types infrastructure/release-gates/check-live-contracts.ts
```

When `LIVE_CONTRACT_REQUIRE=true`, missing base URL causes the checker to fail.
