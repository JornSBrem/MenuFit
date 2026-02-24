# Admin Routes

Baseline `/api/v3/admin` handlers:

- `ingest`
- `recompute`
- `configUpdate`
- `cleanup` (dry-run + execute)
- `cutoverChecklist` (deterministic release-gate evaluation)

All handlers require `AdminSessionContext` and reject user sessions.
