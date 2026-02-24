<!-- markdownlint-disable-file -->
# Plan: WI-008 LLM provider adapter preflight and fallback

## Scope

Implement a baseline LLM provider adapter for OpenAI and Azure with strict preflight validation:
- provider config contract and preflight checks
- endpoint, api-version, and deployment/model mapping validation
- unified completion entrypoint with provider-specific request mapping
- guaranteed fallback behavior so primary flow continues when LLM fails
- executable tests for preflight and fallback paths

Out of scope:
- wiring into HTTP `/api/v3/match` routes
- persisted retry queues or background execution
- advanced LLM reranking policy orchestration

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Adapter validates endpoint, deployment/model mapping, and api-version before call.
- [x] OpenAI and Azure request mapping works with one unified adapter API.
- [x] LLM errors return fallback result without throwing, demonstrated by tests.

## Tasks

### Phase 1: Config and contract

- [x] Add LLM config keys for endpoint and model/deployment mapping.
- [x] Add provider adapter types and preflight validation helpers.

### Phase 2: Adapter and fallback

- [x] Implement provider-specific request building and response parsing.
- [x] Implement safe fallback result on preflight/network/response errors.

### Phase 3: Validation and tracking

- [x] Add tests for preflight failures and fallback behavior.
- [x] Update WI-008 tracking and workitem state.
