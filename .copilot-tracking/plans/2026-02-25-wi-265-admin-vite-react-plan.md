<!-- markdownlint-disable-file -->
# Plan: WI-265 Admin web Vite+React applicatie shell

## Scope

**In scope:**
- Vite + React + TypeScript applicatie in `src/admin-web/app/`
- Auth gate (baseUrl + accessToken + operatorId invoer via SessionStorage)
- Tab-navigatie voor Data, Instellingen, Extract, Operations tabs
- Elke tab wired aan `AdminDashboardController` (bestaande bibliotheek)
- Vite dev server met proxy naar backend op :3000
- Shared styles module voor consistente UI
- TypeScript strict mode zonder errors

**Out of scope:**
- OAuth/OIDC login flow (WI-220 al gedaan backend-side, maar OAuth UI vereist aparte WI)
- CSS framework (Tailwind, MUI, etc.) — plain inline styles
- Backend server wiring (bestaande Fastify routes zijn al aanwezig)
- Unit tests voor React componenten (Vitest setup is aparte WI)
- Build/CI voor de Vite app (aparte WI)
- Productie deployment (aparte WI)

## Success Criteria

- [x] `npm run typecheck` slaagt zonder errors
- [x] Alle 266 bestaande tests slagen
- [x] App heeft auth gate, tab-navigatie en 4 functionele tabs
- [x] Vite dev server proxyt naar :3000
- [x] `npm run dev` in `src/admin-web/app/` start de applicatie

## Tasks

### Phase 1: Preparation

- [x] Analyseer bestaande admin-web library (controller, types, API client)
- [x] Bepaal app-structuur: app/ submap met eigen package.json
- [x] Voeg WI-265 toe aan workitems.md

### Phase 2: Implementation

- [x] Maak `src/admin-web/app/package.json` (Vite + React + TypeScript dependencies)
- [x] Maak `src/admin-web/app/tsconfig.json` (strict mode, path alias @lib)
- [x] Maak `src/admin-web/app/vite.config.ts` (react plugin + proxy /api → :3000)
- [x] Maak `src/admin-web/app/index.html`
- [x] Maak `src/main.tsx` (React root)
- [x] Maak `src/App.tsx` (session state, auth gate, tab routing)
- [x] Maak `src/components/LoginGate.tsx` (form: baseUrl + token + operatorId)
- [x] Maak `src/components/TabBar.tsx` (4 tabs met highlight)
- [x] Maak `src/components/StatusBanner.tsx` (loading/error banner)
- [x] Maak `src/tabs/shared-styles.ts` (gedeelde inline styles)
- [x] Maak `src/tabs/DataTab.tsx` (diagnostics + recepten + weekmenu + mapping overrides CRUD)
- [x] Maak `src/tabs/SettingsTab.tsx` (config form + huidige instellingen + audit trail)
- [x] Maak `src/tabs/ExtractTab.tsx` (ingest form + recompute form + cleanup + jobs)
- [x] Maak `src/tabs/OperationsTab.tsx` (operation history + households + invitations + session diagnostics)

### Phase 3: Validation

- [x] `npm install` slaagt (120 packages, 0 vulnerabilities)
- [x] `npm run typecheck` slaagt zonder errors
- [x] Alle 266 unit tests slagen
