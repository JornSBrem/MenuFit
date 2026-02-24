<!-- markdownlint-disable-file -->
# Plan: WI-206 Persistent storage and migrations baseline

## Scope

Add persistent storage with schema migration support for baseline in-memory domains:
- silver transform outputs
- gold read models
- system jobs/reports
- cart idempotency reports
- audit trail events

Out of scope:
- full relational database integration (Postgres/SQLite ORM runtime)
- distributed locking and concurrent multi-process write coordination

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Silver/gold/job/idempotency/audit data has persistent storage with schema migrations.
- [x] Reprocess and reports remain deterministic with persisted reads/writes.

## Tasks

### Phase 1: Persistent state store

- [x] Add versioned persistent-state store with migration pipeline.
- [x] Add migration coverage tests and default schema state.

### Phase 2: Service wiring

- [x] Wire persistent storage into gold read service.
- [x] Wire persistent storage into system operations (jobs/reports) and cart sync (idempotency reports).
- [x] Wire persistent storage into matching review state and central audit trail.
- [x] Persist silver reprocess outputs.

### Phase 3: Validation and tracking

- [x] Add/extend tests for persistence rehydration and deterministic behavior.
- [x] Update docs, plan, and changes tracking for WI-206.
