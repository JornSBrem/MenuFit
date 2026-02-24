# Cart Sync Baseline

Application cart workflow for WI-009:

- idempotent sync execution by `idempotencyKey`
- explicit sync report payload for success/failure/replay
- admin-only dry-run guard (`dry-run` blocked for user flow)
- centralized audit-trail events for sync/replay/rejection outcomes
- optional persisted idempotency report storage across service restarts

Persistence and real Picnic integration are intentionally deferred.
