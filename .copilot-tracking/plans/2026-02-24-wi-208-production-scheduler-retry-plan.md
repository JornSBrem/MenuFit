<!-- markdownlint-disable-file -->
# Plan: WI-208 Production scheduler + background retry queues

## Scope

Implement a production scheduler baseline and persistent retry queues for ingest/system background work:
- add scheduler module that registers jobs and tracks run state (`running/completed/failed`)
- persist scheduler run history and retry queue entries in app state schema/migrations
- add persistent retry queue module with due-claim, completion, failure/backoff, and dead-letter behavior
- add a coordinator that wires scheduled ingest/system executions to scheduler + retry queue
- add scheduled wrappers for system operations and ingest jobs with tests

Out of scope:
- distributed/multi-process scheduler ownership and locking (covered by `WI-214`)
- external queue brokers, dashboards, and production observability stack integration (covered by `WI-211`)

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Ingest/system jobs can run via production scheduler with persisted run status and failure message tracking.
- [x] Retry queue entries are persisted and survive process restart while keeping deterministic retry ordering.
- [x] Failed scheduled jobs enqueue retry work items with bounded attempts and dead-letter behavior.

## Tasks

### Phase 1: Scheduler and retry queue modules

- [x] Add scheduler run record types and persistent retry queue entry types.
- [x] Implement `ProductionScheduler` for job registration, execution, and run-state persistence.
- [x] Implement `PersistentRetryQueue` for enqueue/claim/complete/fail with backoff and dead-letter.

### Phase 2: Coordination + job wiring

- [x] Implement `ProductionJobCoordinator` for ingest/system run wiring and retry enqueue behavior.
- [x] Extend system operations job wrappers with scheduled execution paths.
- [x] Add tests for scheduler, queue, coordinator, and system-job scheduled wrappers.

### Phase 3: Persistence + tracking

- [x] Extend persistent state schema/migration to include scheduler runs and retry queue entries.
- [x] Update docs/tracking artifacts (`plans`, `changes`, `workitems`).
