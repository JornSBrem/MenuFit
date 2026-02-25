<!-- markdownlint-disable-file -->
# Plan: WI-225 Postgres runtime en operationele DB setup voor persistente domeinen

## Scope

Add Postgres runtime support for persistent state domains with operational setup guidance:
- extend persistent state store driver support with postgres runtime backend
- add migration/bootstrap SQL path and secure connection configuration keys
- add production Postgres provisioning assets and operational runbooks
- cover connection pooling, backup, and restore procedures in docs

Out of scope:
- automated sqlite-to-postgres data migration tooling for live cutover
- sharded/multi-region postgres topology

## Docs Used

- `src/backend/integrations/storage/README.md`
- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `infrastructure/environments/prod/README.md`

## Success Criteria

- [x] Persistente domeinen draaien op Postgres runtime met migraties en veilige connectieconfiguratie.
- [x] Operationele runbooks dekken pooling, backup en herstel voor productiegebruik.

## Tasks

### Phase 1: Runtime integration

- [x] Add postgres driver support in persistent state store and runtime store factory.
- [x] Add/update tests for postgres driver behavior and config surface.

### Phase 2: Operational setup

- [x] Add production postgres provisioning artifacts and parameter examples.
- [x] Add operations runbook sections for pooling, backup, and restore.

### Phase 3: Validation and tracking

- [x] Run targeted backend tests for storage/config runtime paths.
- [x] Update tracking artifacts (`plans`, `changes`, `workitems`) after implementation.
