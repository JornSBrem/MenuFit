---
description: 'TypeScript backend standards for MenuFit API, jobs, adapters, and domain workflows.'
applyTo: 'src/backend/**,src/shared/**'
---

# MenuFit Backend TypeScript Standards

## Module Boundaries

- Keep transport layer (HTTP/CLI/jobs) separate from domain services.
- Keep external integrations in adapter modules, not in core domain logic.
- Keep shared contracts and validators aligned with `src/shared/`.

## API and Data Contracts

- Design API changes contract-first and version where needed.
- Validate all incoming request payloads and external adapter responses.
- Return predictable error shapes with stable error codes.

## Domain and Reliability

- Keep business rules deterministic and side-effect free where possible.
- Make idempotency explicit for ingest/recompute/sync jobs.
- Add structured logs around workflow boundaries and failure paths.

## Testing and Safety

- Add unit tests for domain rules and calculation logic.
- Add integration tests for critical API flows and adapter behavior.
- Never hardcode credentials, tokens, or environment secrets in source files.
