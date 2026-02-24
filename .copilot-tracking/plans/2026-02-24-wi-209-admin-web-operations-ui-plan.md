<!-- markdownlint-disable-file -->
# Plan: WI-209 Admin web React/Vite UI uitwerken voor operations dashboards

## Scope

Implement an admin-web dashboard interaction layer that can drive a React/Vite UI with explicit per-view UI states and interactive operations:
- add typed view-state models (`loading/empty/error/success`) for Data, Instellingen, Extract, and Operations views
- add admin dashboard controller logic for tab switching, state transitions, and action execution
- expand admin API client surface with diagnostics/jobs reads so views can load live operational data
- wire interactive critical operations (ingest, recompute, cleanup, diagnostics) into controller actions
- add tests validating state transitions and success/error handling for each view

Out of scope:
- full visual React component tree and Vite build/deploy pipeline wiring (covered by `WI-212`)
- runtime locale switching and persisted locale preferences (covered by `WI-218`)

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Data/Instellingen/Extract/Operations views expose deterministic `loading/empty/error/success` state transitions.
- [x] Ingest/recompute/cleanup/diagnostics flows are executable through dashboard actions with structured result handling.
- [x] Admin-web modules remain admin-session scoped and test-covered.

## Tasks

### Phase 1: API and state model expansion

- [x] Extend admin-web types and API client with diagnostics/jobs contracts needed by dashboard views.
- [x] Add reusable per-view async state model covering loading/empty/error/success.

### Phase 2: Dashboard controller flows

- [x] Implement dashboard controller/state store for tab switching and view refresh workflows.
- [x] Implement action handlers for ingest/recompute/cleanup and settings updates with operation history tracking.
- [x] Implement diagnostics/extract loaders that classify empty versus success states.

### Phase 3: Validation and tracking

- [x] Add unit tests for all view states and critical flow actions.
- [x] Update tracking artifacts (`plans`, `changes`, `workitems`) once implementation is complete.
