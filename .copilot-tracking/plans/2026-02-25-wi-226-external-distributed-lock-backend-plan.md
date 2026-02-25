<!-- markdownlint-disable-file -->
# Plan: WI-226 Externe distributed lock backend integratie (Redis/etcd)

## Scope

Add configurable external distributed lock backend integration for critical state writes:
- extend lock coordination with external lease lock coordinator and renew semantics
- add redis lock backend client wiring in runtime configuration and persistent store factory
- add fail-open/fail-closed behavior for backend outage scenarios
- provide production redis provisioning assets and failover runbook

Out of scope:
- etcd backend client implementation (full parity with redis backend)
- lock contention telemetry dashboards (tracked separately)

## Docs Used

- `src/backend/integrations/storage/distributed-lock.ts`
- `src/backend/integrations/storage/README.md`
- `infrastructure/environments/prod/README.md`

## Success Criteria

- [x] Kritieke writes gebruiken configureerbare externe lock backend met lease/renew semantics.
- [x] Failover/pad bij lock backend storingen is gedocumenteerd en getest.

## Tasks

### Phase 1: Lock backend integration

- [x] Add external lease lock coordinator and redis backend client implementation.
- [x] Wire runtime config (`STATE_LOCK_*`) to select file or redis lock coordination.

### Phase 2: Operations and failover

- [x] Add redis provisioning assets for production lock backend setup.
- [x] Add failover runbook and fallback behavior documentation.

### Phase 3: Validation and tracking

- [x] Add/extend tests for external lock behavior and backend failure modes.
- [x] Update tracking artifacts (`plans`, `changes`, `workitems`) after implementation.
