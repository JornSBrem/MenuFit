<!-- markdownlint-disable-file -->
# Plan: WI-012 Observability diagnostics and system operations jobs

## Scope

Implement baseline system operations tooling:
- `/api/v3/system` handlers for health, diagnostics, and job status
- backup/restore/cleanup operations with dry-run + execute modes
- observable job/report records with operation logs
- in-memory job runner baseline for system operations

Out of scope:
- real filesystem snapshot/restore integration
- external observability stack integrations (Prometheus/OpenTelemetry)
- production-grade scheduler and persistence

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Health/diagnostics and job status are available via `/api/v3/system`.
- [x] Backup/restore/cleanup support dry-run and execute mode.
- [x] System operation reports contain operation logs and are test-verified.

## Tasks

### Phase 1: System service and job contracts

- [x] Add system health/diagnostics/job/report types.
- [x] Add system operations service with job tracking and log events.

### Phase 2: System routes and job wrappers

- [x] Add `/api/v3/system` route handlers for health, diagnostics, jobs, backup, restore, cleanup.
- [x] Add jobs-layer wrapper module for system operation invocation.

### Phase 3: Validation and tracking

- [x] Add tests for health/diagnostics/jobs and dry-run/execute operations.
- [x] Update WI-012 tracking files and workitem status.
