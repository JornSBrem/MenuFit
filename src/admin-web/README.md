# Admin Web Boundary

`src/admin-web` hosts operator-facing functionality:

- data ingest and recompute controls
- configuration and provider settings
- diagnostics and operations tooling

No end-user shopping flow logic should live here.

## WI-011 Baseline

Current admin-web baseline modules in `src/admin-web/src`:

- `types.ts`
- `admin-api.ts`
- `admin-dashboard-state.ts`
- `admin-dashboard-controller.ts`
- `README.md`

This baseline is intentionally separate from `src/ios-user-app` user flow modules and uses admin-session contracts only.

## WI-246 Household + Session Operations

Controller/API contracts now include operationele supportflows for:

- household statusoverzicht + invitation list (filter op household)
- resend invite actie
- user session diagnose
- household/user session reset actie

## WI-248 Runtime Config Validatie + Audit

Admin dashboard controller ondersteunt nu:

- allowlist-validatie voor runtime config keys
- type-validatie voor runtime config values
- settings audit trail met `operationId`, key, value, actor en timestamp
