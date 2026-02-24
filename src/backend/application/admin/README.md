# Admin Operations Baseline

Operator-focused application services:

- ingest run trigger
- recompute trigger
- config updates
- cleanup (dry-run + execute)

All operations are intended to be invoked only from admin-session routes.
Critical operations also emit centralized audit-trail events.
