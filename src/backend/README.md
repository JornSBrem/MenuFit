# Backend Module Boundaries

`src/backend` follows the V3 layered architecture:

- `domain/`: pure business logic, no IO or transport.
- `application/`: use-case orchestration across domain and integrations.
- `integrations/`: external systems (PG, Picnic, LLM, storage adapters).
- `interfaces/`: HTTP/CLI/job entrypoints.
- `jobs/`: scheduled/background workflows and runners.

Keep responsibilities isolated by layer.
