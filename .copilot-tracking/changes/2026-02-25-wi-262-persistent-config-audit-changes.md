<!-- markdownlint-disable-file -->
# Release Changes: WI-262 Persistente backend auditgeschiedenis voor runtime config wijzigingen

**Related Plan**: `.copilot-tracking/plans/2026-02-25-wi-262-persistent-config-audit-plan.md`
**Implementation Date**: 2026-02-25

## Summary

Config audit events worden nu server-side persistent opgeslagen met before/after context. Een dedicated query route maakt filtering op actorId en configKey mogelijk zonder verlies na restart/deploy.

## Changes

### Added

- `src/backend/interfaces/http/admin/admin-config-audit-routes.ts` — `handleListConfigAudit()` route handler; vereist admin session; filtert op category="config" via AuditTrailService; ondersteunt optionele actorId en configKey filters
- `src/backend/interfaces/http/admin/admin-config-audit-routes.test.ts` — 9 tests: auth check, empty list, before/after capture, non-config events gefilterd, actorId filter, configKey filter, gecombineerde filters, volgorde

### Modified

- `src/backend/application/admin/admin-operations-service.ts` — `updateConfig()` leest nu vorige waarde uit configStore voor overschrijven; slaat `before` en `after` op in audit event details

## Release Summary

**Total Files Affected**: 2 nieuw, 1 gewijzigd
