<!-- markdownlint-disable-file -->
# Release Changes: WI-227 Cluster-wide lock observability dashboards

**Related Plan**: 2026-02-25-wi-227-lock-observability-dashboards-plan.md
**Implementation Date**: 2026-02-25

## Summary

Added lock event telemetry counters for file/redis backends, exported lock metrics in observability Prometheus output, and extended Grafana/Prometheus alerting with lock contention and timeout visibility.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-25-wi-227-lock-observability-dashboards-plan.md`
- `.copilot-tracking/changes/2026-02-25-wi-227-lock-observability-dashboards-changes.md`
- `src/backend/integrations/storage/lock-telemetry.ts`
- `src/backend/integrations/storage/lock-telemetry.test.ts`

### Modified

- `workitems/workitems.md`
- `src/backend/integrations/storage/distributed-lock.ts`
- `src/backend/integrations/storage/distributed-lock.test.ts`
- `src/backend/integrations/storage/README.md`
- `src/backend/application/config/create-persistent-state-store.ts`
- `src/backend/interfaces/http/observability/observability-routes.ts`
- `src/backend/interfaces/http/observability/observability-routes.test.ts`
- `src/backend/interfaces/http/observability/README.md`
- `infrastructure/observability/prometheus/alerts/menufit-alerts.yml`
- `infrastructure/observability/grafana/dashboards/menufit-backend-observability.json`
- `infrastructure/observability/README.md`
- `infrastructure/observability/observability-stack-config.test.ts`

### Removed

- _none_

## Validation

- `node --test --experimental-strip-types src/backend/integrations/storage/distributed-lock.test.ts src/backend/integrations/storage/lock-telemetry.test.ts src/backend/interfaces/http/observability/observability-routes.test.ts src/backend/application/config/create-persistent-state-store.test.ts src/backend/integrations/storage/persistent-state-store.test.ts infrastructure/observability/observability-stack-config.test.ts infrastructure/environments/prod/redis/redis-lock-config.test.ts`

## Out-of-scope Conversion Check

Reviewed plan out-of-scope items when moving WI-227 to `DONE`:
- Added `WI-239` for synthetic cluster contention/load testing.
- Added `WI-240` for tenant-level lock isolation analytics.

## Release Summary

**Total Files Affected**: 16
