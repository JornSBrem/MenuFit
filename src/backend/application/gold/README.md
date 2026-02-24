# Gold Serving Baseline

WI-004 gold serving modules:

- `projection.ts`: deterministic silver -> gold read model projection.
- `read-service.ts`: in-memory week read service for summary and groceries.
- `types.ts`: app-ready gold views and response contracts.

Gold responses are designed to be consumed without additional external API calls.
