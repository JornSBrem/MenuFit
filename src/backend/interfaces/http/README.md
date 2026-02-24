# HTTP Interface

Planned route groups:

- `/api/v3/system`
- `/api/v3/config`
- `/api/v3/ingest`
- `/api/v3/data`
- `/api/v3/week`
- `/api/v3/households`
- `/api/v3/match`
- `/api/v3/cart`
- `/api/v3/admin`

Implemented baseline:

- `week/week-routes.ts` for summary and groceries read handlers.
- `cart/cart-routes.ts` for idempotent cart sync and sync report envelopes.
- `household/household-routes.ts` for user-session household bootstrap, invitation lifecycle, and status reads.
- `match/match-routes.ts` for evaluate/queue/review-action/audit/overrides with optional LLM finish-pass.
- `admin/admin-routes.ts` for admin-only ingest/recompute/config/cleanup/cutover-checklist handlers.
- `system/system-routes.ts` for health/diagnostics/jobs and backup/restore/cleanup operations.
- `auth/session-context.ts` for user/admin bearer parsing with optional expiry validation.
- `auth/session-middleware.ts` for bearer-header authorization wrappers with required session-kind checks.
