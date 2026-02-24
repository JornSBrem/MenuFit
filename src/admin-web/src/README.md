# Admin Web Baseline

Baseline modules for WI-011:

- `types.ts`: admin tabs, session contract, operation payloads, envelope model.
- `admin-api.ts`: admin-session API client for `/api/v3/admin/*`.
- `admin-dashboard-state.ts`: minimal state model for Data/Instellingen/Extract/Operations tabs.
- `admin-dashboard-controller.ts`: dashboard interaction layer with per-view `loading/empty/error/success` states and interactive operations flows.
- `i18n/`: NL resource-based string keys and translation helper for admin labels/messages.
- `admin-labels.ts`: typed mapping helpers from tabs/status/errors to localized labels.

These modules are intentionally UI-framework agnostic and can be consumed by a future React/Vite shell.
