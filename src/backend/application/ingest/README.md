# Bronze Ingest Baseline

WI-002 foundation modules:

- `ingest-planner.ts`: builds ingest tasks for week/kcal/basePersons combinations.
- `bronze-runner.ts`: fetches payloads, writes immutable bronze objects, validates checksum, appends manifest.
- `bronze-manifest.ts`: persists ingest manifest records.
- `retry.ts`: generic async retry with exponential backoff.

This is a baseline to be integrated into jobs/routes in follow-up workitems.
