# System Routes

Baseline `/api/v3/system` handlers:

- `health`
- `diagnostics`
- `jobs`
- `backup` (admin-only, dry-run/execute)
- `restore` (admin-only, dry-run/execute)
- `cleanup` (admin-only, dry-run/execute)

Optional hardening (WI-211):

- plug `RequestSecurityPolicy` into `createSystemRouteHandlers(...)` for RBAC/rate-limit/WAF checks
- plug `OperationalTelemetryService` into `createSystemRouteHandlers(...)` for metrics/latency counters
- restore route can be owner-only by policy
