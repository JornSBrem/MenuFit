<!-- markdownlint-disable-file -->
# Plan: WI-213 Relationele database runtime-integratie voor persistente domeinen

## Scope

Add relational runtime persistence support by introducing SQLite as an alternative state backend while keeping current application/service integration points stable:
- extend persistent state store with runtime driver selection (`file` and `sqlite`)
- persist state collections in SQLite tables with schema version metadata and migration compatibility
- wire config-driven store factory to select relational runtime paths
- validate that silver/gold/jobs/idempotency/audit and related persisted domains keep deterministic read/write behavior under sqlite runtime

Out of scope:
- full Postgres production deployment and connection pooling/runtime auth setup
- distributed locking and multi-process write serialization (covered by `WI-214`)

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/best_practices.md`
- `src/backend/integrations/storage/README.md`

## Success Criteria

- [x] Persistent state runtime supports relational SQLite backend in addition to file backend.
- [x] State migration/version handling remains consistent for all persisted domains.
- [x] Config/runtime wiring and tests cover relational runtime path.

## Tasks

### Phase 1: Storage runtime extension

- [x] Extend `PersistentStateStore` with SQLite driver implementation and shared migration path.
- [x] Ensure collections for silver/gold/jobs/idempotency/audit and related persisted domains round-trip through SQLite.

### Phase 2: Config/runtime wiring

- [x] Add config keys and factory wiring for state driver + sqlite path selection.
- [x] Update storage docs to include relational runtime usage.

### Phase 3: Validation and tracking

- [x] Add/extend tests for SQLite persistence and migration behavior.
- [x] Update tracking artifacts (`plans`, `changes`, `workitems`) after implementation.
