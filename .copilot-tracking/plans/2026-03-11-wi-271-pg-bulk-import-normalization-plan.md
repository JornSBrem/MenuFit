<!-- markdownlint-disable-file -->
# Plan: wi-271-pg-bulk-import-normalization

## Scope

Replace the outdated ProjectGezond ingest assumptions with a persistent MenuFit-owned import path based on the current ProjectGezond API and frontend behavior. In scope are backend contract updates, persistent normalized recipe storage, bulk enrichment for nutrition/sections/daymenu links, and read-model updates consumed by the iOS app. Out of scope for this slice are comment synchronization, incremental delta sync, and full admin UI redesign for the new import model.

## Success Criteria

- [ ] MenuFit can ingest authenticated ProjectGezond week menus and recipe details using the current live endpoint family.
- [ ] Imported recipes persist normalized detail fields required by the product: ingredients, preparation/tips sections, nutrition, linked day menus, image, and metadata.
- [ ] Existing MenuFit read routes can serve recipes and week data from local persistent storage without live ProjectGezond reads.

## Tasks

### Phase 1: Preparation

- [ ] Inspect current PG response shapes and map them to MenuFit-owned recipe and week entities.
- [ ] Introduce plan-aligned persistent state/types for normalized imported recipe records.

### Phase 2: Implementation

- [ ] Update PG endpoint defaults/contracts and fetchers to the current API paths.
- [ ] Add normalized recipe import/enrichment pipeline for recipe detail, nutrition, sections, and daymenu links.
- [ ] Persist imported recipe catalog and expose it through backend read services/routes used by the iOS app.

### Phase 3: Validation

- [ ] Add or update backend tests for endpoint rendering, normalization, persistence migration, and read service behavior.
- [ ] Run targeted typecheck/tests and document remaining gaps if full runtime verification is not possible locally.
