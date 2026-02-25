<!-- markdownlint-disable-file -->
# Release Changes: WI-222 Externe observability stack provisioning (Prometheus/Grafana) voor productie

**Related Plan**: 2026-02-25-wi-222-observability-stack-provisioning-plan.md
**Implementation Date**: 2026-02-25

## Summary

Added versioned external observability stack provisioning assets for Prometheus, Grafana, and Alertmanager, including backend scrape configuration, route/security/job-focused dashboard provisioning, and operational escalation rules for elevated error-rate and blocked-rate.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-25-wi-222-observability-stack-provisioning-plan.md`
- `.copilot-tracking/changes/2026-02-25-wi-222-observability-stack-provisioning-changes.md`
- `infrastructure/observability/.env.example`
- `infrastructure/observability/docker-compose.observability.yml`
- `infrastructure/observability/README.md`
- `infrastructure/observability/prometheus/prometheus.yml`
- `infrastructure/observability/prometheus/alerts/menufit-alerts.yml`
- `infrastructure/observability/alertmanager/alertmanager.yml`
- `infrastructure/observability/grafana/provisioning/datasources/prometheus.yml`
- `infrastructure/observability/grafana/provisioning/dashboards/menufit-dashboard.yml`
- `infrastructure/observability/grafana/dashboards/menufit-backend-observability.json`
- `infrastructure/observability/observability-stack-config.test.ts`
- `docs/ops/observability-runbook.md`

### Modified

- `workitems/workitems.md`
- `infrastructure/README.md`
- `infrastructure/environments/README.md`

### Removed

- _none_

## Validation

- `node --test --experimental-strip-types infrastructure/observability/observability-stack-config.test.ts`

## Out-of-scope Conversion Check

Reviewed plan out-of-scope items when moving WI-222 to `DONE`:
- Added `WI-230` for managed cloud observability service provisioning as IaC.
- Added `WI-231` for long-term retention and multi-cluster federation strategy.

## Release Summary

**Total Files Affected**: 16
