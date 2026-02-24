# Audit Trail Service

Provides a centralized in-memory audit trail for critical backend events:

- admin mutations (`ingest`, `recompute`, `config_update`, `cleanup`)
- system operations (`backup`, `restore`, `cleanup`)
- matching decisions and review actions
- cart sync executions/replays/failures

Event details are redacted by key name for common secret fields (`token`, `secret`, `authorization`, `cookie`, ...).
