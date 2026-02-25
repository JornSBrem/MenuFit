<!-- markdownlint-disable-file -->
# Plan: WI-262 Persistente backend auditgeschiedenis voor runtime config wijzigingen

## Scope

**In scope:**
- Before/after context toevoegen aan `AdminOperationsService.updateConfig()` audit events
- `handleListConfigAudit` route met actorId en configKey filters
- Gebruik van bestaande `AuditTrailService` + `PersistentStateStore` voor persistentie

**Out of scope:**
- Aparte database tabel voor config audit (werkt via bestaande auditTrail in state)
- Paginering van audit resultaten
- Export van audit trail naar extern systeem

## Success Criteria

- [x] Config audit opgeslagen met before/after waarde, actor, timestamp
- [x] Audit history querybaar na restart (via PersistentStateStore)
- [x] Filter op actorId en configKey beschikbaar
- [x] 9 tests passeren

## Tasks

### Phase 1: Before/after context

- [x] `AdminOperationsService.updateConfig()` uitbreiden — vorige waarde ophalen voor overschrijven, `before`/`after` in audit details opslaan

### Phase 2: Query route

- [x] `src/backend/interfaces/http/admin/admin-config-audit-routes.ts` — `handleListConfigAudit()` met category="config" filter
- [x] `src/backend/interfaces/http/admin/admin-config-audit-routes.test.ts` — 9 tests

### Phase 3: Validatie

- [x] Tests draaien foutloos
- [x] Bestaande admin-operations tests nog steeds groen
