<!-- markdownlint-disable-file -->
# Plan: WI-001 Milestone 0 foundations

## Scope

Implement foundation scaffolding for MenuFit V3:
- module boundaries for backend/admin/iOS/shared/infrastructure
- initial storage schema scaffolding for medallion concepts
- runtime config subsystem with metadata (`hotReload`, `sensitive`, `restartRequired`)

Out of scope:
- full ingest/transform pipeline logic
- production deployment wiring
- full auth implementation

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/PG_ENDPOINT_CONTRACT.md`
- `docs/REFACTOR_SIMPLIFICATION_PLAN.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Module boundaries are explicit and discoverable in source tree.
- [x] Config subsystem supports typed keys and metadata flags.
- [x] Foundation docs explain how to extend and use the scaffold.

## Tasks

### Phase 1: Structure

- [x] Create backend/admin/iOS/shared/infrastructure boundary scaffold docs/files.
- [x] Add medallion storage schema draft artifacts under backend domain.

### Phase 2: Config subsystem

- [x] Implement shared config registry with metadata flags.
- [x] Implement runtime config store with typed get/set and safe public view.

### Phase 3: Validation and tracking

- [x] Update changes file with created/modified files.
- [x] Validate repository structure consistency and mark WI-001 state.
