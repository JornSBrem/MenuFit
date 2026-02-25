<!-- markdownlint-disable-file -->
# Plan: WI-247 Database platformkeuze en migratiepad

## Scope

Produce a decision record comparing Supabase and current PostgreSQL stack for MVP delivery:
- evaluate auth, RLS/security, operations burden, cost trajectory, and lock-in risks
- choose recommended direction for MVP
- define pragmatic adoption/migration path and rollback strategy

Out of scope:
- executing full data migration
- provisioning new managed platform infrastructure

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `workitems/workitems.md`
- `src/backend/**`

## Success Criteria

- [x] Beslisdocument vergelijkt Supabase en huidige stack op auth, RLS/security, operations, kosten en vendor lock-in.
- [x] Gekozen richting heeft een concreet migratie-/adoptiepad met scope, risico's en rollbackstrategie.

## Tasks

### Phase 1: Decision inputs

- [x] Inventory current architecture/runtime dependencies on PostgreSQL and auth model.
- [x] Compare Supabase capabilities against current MVP requirements.

### Phase 2: Recommendation

- [x] Document recommendation with rationale and explicit trade-offs.
- [x] Define phased rollout/migration and rollback checkpoints.

### Phase 3: Tracking

- [x] Update tracking artifacts and move WI-247 to done.
