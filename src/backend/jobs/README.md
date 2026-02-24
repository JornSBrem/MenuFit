# Jobs Layer

Background workflows:

- ingest planner and runner
- recompute and reprocess
- cleanup and diagnostics operations
- system operations wrappers (`system-operations-jobs.ts`)
- production scheduler with persisted run status (`production-scheduler.ts`)
- persistent retry queue for external dependency failures (`persistent-retry-queue.ts`)
- coordinator for scheduled ingest/system execution + retry handling (`job-coordinator.ts`)

Jobs should be idempotent and observable.
