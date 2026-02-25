<!-- markdownlint-disable-file -->
# Plan: WI-266 Backend HTTP server entry point met dev admin token bootstrap

## Scope

**In scope:**
- `src/backend/server.ts` — minimale Node.js `node:http` server (geen externe dependencies)
- Instantiëert alle benodigde services: SessionLifecycleService, AdminOperationsService, AdminDataService, SystemOperationsService, AuditTrailService, PersistentStateStore
- Issues een dev admin token op startup (TTL 24 uur), print naar console en schrijft naar `out/dev-admin-token.txt`
- Routes alle admin API-endpoints die de admin web app (WI-265) gebruikt
- CORS-headers voor localhost:5173
- `scripts/create-admin-token.ts` — standalone token generator die dezelfde state file gebruikt als de server
- `/health` endpoint zonder auth

**Out of scope:**
- Fastify of een ander HTTP framework (geen package.json op root-niveau)
- OAuth/OIDC login flow voor admin (WI-220 is backend-only, UI vereist aparte WI)
- Volledige household admin routes (WI-260 implementeert deze)
- Production deployment / TLS / reverse proxy
- Rate limiting / WAF (kan later via RequestSecurityPolicy worden aangesloten)

## Success Criteria

- [x] Server start met `node --experimental-strip-types src/backend/server.ts`
- [x] Token wordt geprint naar console en opgeslagen in `out/dev-admin-token.txt`
- [x] Alle 266 unit tests slagen
- [x] `/health` geeft `{ ok: true, status: "up" }` terug
- [x] Admin web app (WI-265) kan verbinden met backend via token uit console

## Tasks

### Phase 1: Research

- [x] Analyseer session-lifecycle-service.ts (token formaat, validateSessionToken)
- [x] Analyseer session-middleware.ts (authorizeAdminFromBearerHeader)
- [x] Controleer admin-routes.ts, admin-data-routes.ts, system-routes.ts (handler signatures)
- [x] Controleer of Fastify beschikbaar is (nee — geen package.json op root)

### Phase 2: Implementation

- [x] Maak `src/backend/server.ts` met Node.js `node:http`
- [x] Issue dev admin token op startup via SessionLifecycleService
- [x] Persisteer sessies via PersistentStateStore (zodat token geldig blijft na restart als server opnieuw start met zelfde file)
- [x] Wire alle admin routes met session-middleware auth
- [x] CORS preflight + headers op alle responses
- [x] Stub household admin routes (WI-260)
- [x] Maak `scripts/create-admin-token.ts`

### Phase 3: Validation

- [x] Server start en print token
- [x] `scripts/create-admin-token.ts` genereert geldig token
- [x] Alle 266 unit tests slagen
