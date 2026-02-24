# Match Routes

`/api/v3/match/*` handler group:

- `evaluate`: shared-core evaluation with optional LLM finish-pass orchestration
- `queue`: list current review queue items
- `reviewAction`: apply manual review actions (`map`, `skip`, `defer`)
- `auditTrail`: list matching audit events
- `overrides`: list applied override records

All handlers return stable `ApiEnvelope<T>` response shape.
