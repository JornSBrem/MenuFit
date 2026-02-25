<!-- markdownlint-disable-file -->
# Release Changes: WI-263 Rendered admin UI componenten voor recepten/weekmenu/mapping beheer

**Related Plan**: `.copilot-tracking/plans/2026-02-25-wi-263-data-ui-renderer-plan.md`
**Implementation Date**: 2026-02-25

## Summary

Framework-agnostische HTML string renderer voor de data management tab. Elke sectie heeft een datatable met delete-buttons en een upsert-formulier met inline validatie en bevestigingsbanners. XSS-safe via volledige HTML-escaping.

## Changes

### Added

- `src/admin-web/src/renderers/data-renderer.ts` — `renderDataTab(viewState, options?)` met loading/empty/error/success states; receptensectie met `renderRecipesTable()` en `renderRecipeForm()`; weekmenusectie met `renderWeekMenusTable()` en `renderWeekMenuForm()`; mapping-override sectie met `renderMappingOverridesTable()` en `renderMappingOverrideForm()`; validatie helpers `validateRecipeFormInput()`, `validateWeekMenuFormInput()`, `validateMappingOverrideFormInput()`; alle delete-buttons hebben `data-action` + entity-id attributen voor host-side event binding
- `src/admin-web/src/renderers/data-renderer.test.ts` — 31 tests: alle render states, tabellen met data, delete-buttons, form validatie-errors, bevestigingsbanners, form pre-fill, XSS escaping

## Release Summary

**Total Files Affected**: 2 nieuw
