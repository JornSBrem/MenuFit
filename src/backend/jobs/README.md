# Jobs Layer

Background workflows:

- ingest planner and runner
- recompute and reprocess
- cleanup and diagnostics operations
- system operations wrappers (`system-operations-jobs.ts`)

Jobs should be idempotent and observable.
