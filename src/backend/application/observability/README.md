# Observability Baseline

Runtime telemetry for operational dashboards and release-gate inputs:

- per-route HTTP outcome counters
- request duration aggregates
- security event counters (RBAC/rate-limit/WAF)
- snapshot export for dashboard consumption
- Prometheus text export (`toPrometheusMetrics`)
