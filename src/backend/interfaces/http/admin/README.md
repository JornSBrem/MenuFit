# Admin Routes

Baseline `/api/v3/admin` handlers:

- `ingest`
- `recompute`
- `configUpdate`
- `cleanup` (dry-run + execute)

All handlers require `AdminSessionContext` and reject user sessions.
