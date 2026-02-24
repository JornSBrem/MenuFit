# Application Layer

Application services orchestrate domain logic and integrations:

- run ingest/recompute flows
- execute match and review workflows
- trigger cart sync safely

Current workflow modules:
- `ingest/`
- `silver/`
- `gold/`
- `matching/`
- `cart/`
- `admin/`
- `system/`

Application code should not contain UI concerns.
