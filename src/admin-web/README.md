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
- `README.md`

This baseline is intentionally separate from `src/ios-user-app` user flow modules and uses admin-session contracts only.
