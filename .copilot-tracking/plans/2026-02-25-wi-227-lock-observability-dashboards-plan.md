<!-- markdownlint-disable-file -->
# Plan: WI-227 Cluster-wide lock observability dashboards

## Scope

Add lock-specific observability coverage for distributed lease coordination:
- instrument lock acquire/timeout/stale-reclaim counters in lock coordination layer
- expose lock metrics in Prometheus output for operational scraping
- extend observability dashboards and alert rules with lock contention and timeout signals
- add tests for lock metrics export paths

Out of scope:
- end-to-end synthetic contention load testing at cluster scale
- tenant-level lock isolation analytics

## Docs Used

- `src/backend/integrations/storage/distributed-lock.ts`
- `src/backend/application/observability/operational-telemetry-service.ts`
- `infrastructure/observability/README.md`

## Success Criteria

- [x] Lock acquire/timeout/stale-reclaim metrics zijn zichtbaar in operationele dashboards.
- [x] Alerts bestaan voor verhoogde lock contention en timeouts.

## Tasks

### Phase 1: Lock metrics instrumentation

- [x] Add lock telemetry counters for acquire success, timeout and stale reclaim events.
- [x] Export lock metrics into Prometheus payload output.

### Phase 2: Dashboard and alerts

- [x] Update Grafana dashboard provisioning with lock metrics panels.
- [x] Add Prometheus alert rules for high lock contention/timeout rates.

### Phase 3: Validation and tracking

- [x] Add/update tests for lock metrics collection/export behavior.
- [x] Update tracking artifacts (`plans`, `changes`, `workitems`) after implementation.
