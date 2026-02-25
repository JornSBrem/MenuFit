# Storage Integration

Storage adapter helpers for medallion files:

- bronze path generation
- bronze payload persistence
- checksum helpers for integrity validation
- versioned persistent state store with schema migration support for silver/gold/jobs/idempotency/audit/households/auth sessions
- runtime driver selection for persistent state: `file` JSON, relational `sqlite`, or `postgres`
- lease-based distributed write lock coordination for multi-process update safety

Config keys for state runtime:

- `STATE_STORE_DRIVER` (`file`, `sqlite`, or `postgres`)
- `STATE_STORE_PATH` (file-driver path)
- `STATE_STORE_SQLITE_PATH` (sqlite-driver DB path)
- `STATE_STORE_POSTGRES_URL` (postgres connection URL; supports `*_FILE` secret resolution)
- `STATE_STORE_POSTGRES_LOCK_PATH` (lock file path for postgres driver critical sections)
