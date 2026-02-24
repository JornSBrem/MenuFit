# Admin Web Baseline

Baseline modules for WI-011:

- `types.ts`: admin tabs, session contract, operation payloads, envelope model.
- `admin-api.ts`: admin-session API client for `/api/v3/admin/*`.
- `admin-dashboard-state.ts`: minimal state model for Data/Instellingen/Extract/Operations tabs.

These modules are intentionally UI-framework agnostic and can be consumed by a future React/Vite shell.
