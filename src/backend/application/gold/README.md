# Gold Serving Baseline

WI-004 gold serving modules:

- `projection.ts`: deterministic silver -> gold read model projection.
- `read-service.ts`: week read service for summary and groceries (in-memory + optional persisted state).
- `types.ts`: app-ready gold views and response contracts.

Gold responses are designed to be consumed without additional external API calls.
