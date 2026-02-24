# Admin Routes

Baseline `/api/v3/admin` handlers:

- `ingest`
- `recompute`
- `configUpdate`
- `cleanup` (dry-run + execute)
- `cutoverChecklist` (deterministic release-gate evaluation)

All handlers require `AdminSessionContext` and reject user sessions.

Optional hardening (WI-211):

- plug `RequestSecurityPolicy` into `createAdminRouteHandlers(...)` to enforce RBAC/rate-limit/WAF checks
- plug `OperationalTelemetryService` into `createAdminRouteHandlers(...)` for route metrics counters
- owner-only by policy for sensitive operations (`configUpdate`, `cutoverChecklist`)
