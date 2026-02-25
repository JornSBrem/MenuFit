# Observability Runbook

## Error Rate

Alert: `MenuFitHighHttpErrorRate`

1. Open Grafana dashboard `MenuFit Backend Observability`.
2. Inspect `HTTP Request Rate by Route` and isolate routes with high `client_error` / `server_error` proportions.
3. Correlate with recent deploy changes and upstream dependency status.
4. If errors are caused by recent rollout, revert to previous stable release and verify recovery in Prometheus.

## Blocked Rate

Alert: `MenuFitHighBlockedRate`

1. Check `Blocked Rate` and `Security Events (15m)` panels.
2. Determine whether surge is expected (legitimate policy enforcement) or indicates misconfigured RBAC/rate-limit/WAF rules.
3. If needed, temporarily tune route-level policy thresholds with explicit change ticket and follow-up hardening review.
4. Confirm blocked-rate returns below threshold and close incident with root-cause notes.
