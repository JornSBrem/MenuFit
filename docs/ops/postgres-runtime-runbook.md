# Postgres Runtime Operations Runbook

## Connection Pooling

Target connection pooling with PgBouncer behavior (or managed equivalent):

1. Keep backend app pool small and bounded (for example `max=20` per replica).
2. Ensure server-side connection ceiling (`max_connections`) supports peak + admin/maintenance traffic.
3. Prefer transaction pooling mode for API workloads.
4. Track pool saturation and queue latency in observability dashboards.

## Backup

Use scheduled full backups with PITR support:

1. Validate backup retention window (minimum 14 days in production).
2. Regularly verify automated backup success in cloud monitoring.
3. Run periodic logical export checks for critical datasets:

```bash
pg_dump "$STATE_STORE_POSTGRES_URL" --format=custom --file /tmp/menufit-state-$(date +%F).dump
```

## Restore

1. Perform point-in-time restore to isolated target server.
2. Validate schema and key records before cutover.
3. Repoint runtime connection string only after validation:

```bash
psql "$STATE_STORE_POSTGRES_URL" -v ON_ERROR_STOP=1 -f src/backend/domain/storage/sql/state-postgres-schema.sql
```

4. Keep rollback path by retaining previous runtime URL and restoring app configuration if validation fails.
