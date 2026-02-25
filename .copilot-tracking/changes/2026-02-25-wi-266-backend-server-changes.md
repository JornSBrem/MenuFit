<!-- markdownlint-disable-file -->
# Release Changes: WI-266 Backend HTTP server entry point met dev admin token bootstrap

**Related Plan**: `.copilot-tracking/plans/2026-02-25-wi-266-backend-server-plan.md`
**Implementation Date**: 2026-02-25

## Summary

Eerste werkende backend HTTP server. Gebruikt uitsluitend Node.js ingebouwde `node:http` (geen externe dependencies). Op startup wordt via `SessionLifecycleService` een dev admin token (24 uur geldig) aangemaakt, geprint naar de console, en opgeslagen in `out/dev-admin-token.txt`. Alle admin API routes die de admin web app (WI-265) aanroept zijn beschikbaar op poort 3000. CORS staat open voor localhost:5173.

## Changes

### Added

- `src/backend/server.ts` — Node.js HTTP server op poort 3000:
  - Instantiëert: SessionLifecycleService (met PersistentStateStore), AuditTrailService, AdminOperationsService, AdminDataService, SystemOperationsService
  - Bootstrapt dev admin token op startup, print naar console + schrijft naar `out/dev-admin-token.txt`
  - Valideert admin sessions via `authorizeAdminFromBearerHeader` + `SessionLifecycleService`
  - Routes: `/health`, `/api/v3/system/diagnostics`, `/api/v3/system/jobs`, `/api/v3/admin/ingest`, `/api/v3/admin/recompute`, `/api/v3/admin/config`, `/api/v3/admin/cleanup`, `/api/v3/admin/data/recipes/*`, `/api/v3/admin/data/week-menus/*`, `/api/v3/admin/data/mapping-overrides/*`, `/api/v3/admin/households/*` (stub)
  - CORS-headers op alle responses (incl. preflight OPTIONS)

- `scripts/create-admin-token.ts` — Standalone token generator:
  - Gebruikt dezelfde PersistentStateStore en SessionLifecycleService als de server
  - Schrijft token naar `out/dev-admin-token.txt`
  - Accepteert optionele CLI args: `operatorId role ttl_hours`
  - Gebruik: `node --experimental-strip-types scripts/create-admin-token.ts [operatorId] [role] [ttl_hours]`

### Modified

- `workitems/workitems.md` — WI-266 van TODO naar DONE; toegevoegd aan `## Done (recent additions)`

## Release Summary

**Total Files Affected**: 2 nieuw, 1 gewijzigd

**Test results**: 266/266 tests slagen ✅
**Server startup**: prints token, luistert op :3000 ✅
**Token script**: genereert en print geldig token ✅

## Gebruik

```bash
# Start backend
node --experimental-strip-types src/backend/server.ts

# Of genereer los token (server hoeft niet te draaien)
node --experimental-strip-types scripts/create-admin-token.ts

# Kopieer token uit console/out/dev-admin-token.txt
# Open http://localhost:5173 (na: cd src/admin-web/app && npm run dev)
# Vul in:
#   Backend URL:  http://localhost:3000
#   Operator ID:  dev-admin
#   Token:        admin:dev-admin:sess-N:owner:...
```
