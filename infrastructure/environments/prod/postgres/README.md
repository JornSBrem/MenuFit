# Production Postgres Runtime Setup (WI-225)

Postgres operational setup artifacts for persistent MenuFit domains.

## Assets

- `postgres-flex-server.bicep`: Azure Database for PostgreSQL Flexible Server + app database.
- `postgres-flex-server.parameters.example.json`: example parameter file.
- `deploy-prod-postgres.sh`: non-interactive deployment wrapper.

## Runtime Configuration

Set backend runtime driver to postgres and source secrets from files/env:

- `STATE_STORE_DRIVER=postgres`
- `STATE_STORE_POSTGRES_URL=postgres://<user>:<password>@<host>:5432/<db>?sslmode=require`
- `STATE_STORE_POSTGRES_LOCK_PATH=out/v3/state/menu-fit-state.postgres.lock`

Use `<KEY>_FILE` env fallback for secrets where possible.

## Deploy

```bash
chmod +x infrastructure/environments/prod/postgres/deploy-prod-postgres.sh
infrastructure/environments/prod/postgres/deploy-prod-postgres.sh \
  <resource-group> \
  infrastructure/environments/prod/postgres/postgres-flex-server.parameters.example.json
```

## Schema Migration Bootstrap

Apply runtime schema SQL after DB provisioning:

```bash
psql "$STATE_STORE_POSTGRES_URL" -v ON_ERROR_STOP=1 -f src/backend/domain/storage/sql/state-postgres-schema.sql
```

For pooling/backup/restore procedures, see `docs/ops/postgres-runtime-runbook.md`.
