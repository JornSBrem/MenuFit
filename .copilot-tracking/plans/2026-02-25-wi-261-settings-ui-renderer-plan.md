<!-- markdownlint-disable-file -->
# Plan: WI-261 Rendered admin UI componenten voor runtime settings configuratie

## Scope

**In scope:**
- Framework-agnostische HTML string renderer voor de settings tab
- Config schema (allowed keys + types) gespiegeld vanuit controller validatieregels
- Inline validatie-errors en bevestigingsbanners in rendered output
- Type-specifieke form inputs (boolean select, number input, text input)
- Audit trail tabel in omgekeerde chronologische volgorde
- XSS escaping van alle user-supplied data
- Validatie- en parse-helpers voor form input → ConfigUpdateRequest

**Out of scope:**
- React/Vue/Svelte componenten (admin-web heeft nog geen UI-framework setup)
- CSS stylesheets
- Client-side JavaScript event handling (wordt door host shell gedaan via data-action attrs)

## Success Criteria

- [x] `renderSettingsTab()` rendert loading/empty/error/success states correct
- [x] Form toont type-specifieke inputs per config key
- [x] Inline validatie-errors en bevestigingsbanners zichtbaar
- [x] Audit trail in omgekeerde volgorde (meest recent bovenaan)
- [x] XSS escaping aantoonbaar in tests
- [x] 30 tests passeren

## Tasks

### Phase 1: Renderer

- [x] `src/admin-web/src/renderers/settings-renderer.ts` — `renderSettingsTab()`, `SETTINGS_SCHEMA`, `renderUpdateForm()`, `renderAuditTrail()`
- [x] Helpers: `validateSettingsFormInput()`, `parseSettingsFormValue()`

### Phase 2: Tests

- [x] `src/admin-web/src/renderers/settings-renderer.test.ts` — 30 tests: alle states, form pre-fill, type inputs, validatie, XSS

### Phase 3: Validatie

- [x] 30 tests groen
