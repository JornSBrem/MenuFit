# Storage Integration

Storage adapter helpers for medallion files:

- bronze path generation
- bronze payload persistence
- checksum helpers for integrity validation
- versioned persistent state store with schema migration support for silver/gold/jobs/idempotency/audit/households/auth sessions
- runtime driver selection for persistent state: `file` JSON or relational `sqlite`

Config keys for state runtime:

- `STATE_STORE_DRIVER` (`file` or `sqlite`)
- `STATE_STORE_PATH` (file-driver path)
- `STATE_STORE_SQLITE_PATH` (sqlite-driver DB path)
