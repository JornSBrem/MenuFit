<!-- markdownlint-disable-file -->
# Plan: WI-263 Rendered admin UI componenten voor recepten/weekmenu/mapping beheer

## Scope

**In scope:**
- Framework-agnostische HTML string renderer voor de data tab (recepten, weekmenu's, mapping overrides)
- Datatabellen met per-rij delete buttons (data-action attributen)
- Upsert formulieren met inline validatie-errors en bevestigingsbanners
- Validatie-helpers voor elk entiteittype
- XSS escaping van alle user-supplied data

**Out of scope:**
- React/Vue/Svelte componenten
- CSS stylesheets
- Drag-and-drop reorder
- Bulk delete/export

## Success Criteria

- [x] `renderDataTab()` rendert loading/empty/error/success states correct
- [x] Alle 3 secties (recepten, weekmenu's, overrides) aanwezig
- [x] Delete buttons hebben data-action en data-entity-id attributen
- [x] Upsert forms tonen validatie-errors en bevestigingsbanners
- [x] XSS escaping aantoonbaar in tests
- [x] 31 tests passeren

## Tasks

### Phase 1: Renderer + validatie

- [x] `src/admin-web/src/renderers/data-renderer.ts` — `renderDataTab()`, `renderRecipesTable()`, `renderRecipeForm()`, `renderWeekMenusTable()`, `renderWeekMenuForm()`, `renderMappingOverridesTable()`, `renderMappingOverrideForm()`
- [x] Helpers: `validateRecipeFormInput()`, `validateWeekMenuFormInput()`, `validateMappingOverrideFormInput()`

### Phase 2: Tests

- [x] `src/admin-web/src/renderers/data-renderer.test.ts` — 31 tests: alle states, CRUD interacties, validatie, XSS

### Phase 3: Validatie

- [x] 31 tests groen
