# Matching Workflow Baseline

Application-level matching workflow for WI-007:

- evaluate candidates using shared matching core + central confidence gates
- optional LLM finish-pass orchestration via `match-workflow-service.ts`
- queue `medium` and `low` decisions for review
- apply review actions (`map`, `skip`, `defer`)
- persist feedback to in-memory audit trail and override records
- emit centralized audit-trail events for decisions and review actions
- optional persisted queue/audit/override storage across service restarts

This is intentionally in-memory and route-agnostic; persistence and HTTP wiring follow in next workitems.
