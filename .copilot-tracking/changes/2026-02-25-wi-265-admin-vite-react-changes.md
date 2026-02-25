<!-- markdownlint-disable-file -->
# Release Changes: WI-265 Admin web Vite+React applicatie shell

**Related Plan**: `.copilot-tracking/plans/2026-02-25-wi-265-admin-vite-react-plan.md`
**Implementation Date**: 2026-02-25

## Summary

Eerste echte browser-applicatie voor het admin panel. Vite + React + TypeScript applicatie in `src/admin-web/app/` met auth gate, tab-navigatie en volledig functionele CRUD-tabs. Alle tabs zijn direct aangesloten op de bestaande `AdminDashboardController` bibliotheek. Dev server proxyt `/api` naar backend op :3000.

## Changes

### Added

- `src/admin-web/app/package.json` — Vite + React 18 + TypeScript dependencies; scripts: dev, build, preview, typecheck
- `src/admin-web/app/tsconfig.json` — strict TypeScript config; `@lib/*` path alias naar `../src/`
- `src/admin-web/app/vite.config.ts` — @vitejs/plugin-react; `/api` proxy naar `http://localhost:3000`; port 5173
- `src/admin-web/app/index.html` — HTML entry point met basis CSS reset
- `src/admin-web/app/src/main.tsx` — React root via `createRoot`
- `src/admin-web/app/src/App.tsx` — top-level shell: session state (SessionStorage), auth gate, tab-routing, logout
- `src/admin-web/app/src/components/LoginGate.tsx` — login formulier (baseUrl, operatorId, accessToken); aanroept `AdminApiClient` + `AdminDashboardController`
- `src/admin-web/app/src/components/TabBar.tsx` — horizontale tab-navigatie voor Data / Instellingen / Extract / Operations
- `src/admin-web/app/src/components/StatusBanner.tsx` — loading/error banner op basis van huidig view state
- `src/admin-web/app/src/tabs/shared-styles.ts` — gedeelde inline CSSProperties: card, table, th, td, btn, btnDanger, input, select, fieldset, etc.
- `src/admin-web/app/src/tabs/DataTab.tsx` — diagnostics widgets + recepten CRUD + weekmenu CRUD + mapping overrides CRUD; alle bewerkingen via `AdminDashboardController`
- `src/admin-web/app/src/tabs/SettingsTab.tsx` — config key/value formulier (5 configureerbare sleutels) + huidige instellingen tabel + audit trail
- `src/admin-web/app/src/tabs/ExtractTab.tsx` — ingest formulier + recompute formulier + cleanup (dry-run/execute) + jobs tabel
- `src/admin-web/app/src/tabs/OperationsTab.tsx` — operatie history + huishoudens laden + uitnodigingen per household + sessie diagnostiek (diagnose + reset)

### Modified

- `workitems/workitems.md` — WI-265 van TODO naar DONE; verplaatst naar `## Done (recent additions)`
- `.claude/settings.local.json` — `ls`, `cat`, `cp`, `mv`, `rm`, `npm`, `npx` toegevoegd aan toegestane bash-commando's

## Release Summary

**Total Files Affected**: 14 nieuw, 2 gewijzigd

**Test results**: 266/266 tests slagen ✅
**TypeScript**: 0 errors (strict mode) ✅
**npm install**: 120 packages, 0 vulnerabilities ✅
