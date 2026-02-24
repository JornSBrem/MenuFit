---
description: 'React and TypeScript standards for MenuFit admin-web interfaces and operational tooling.'
applyTo: 'src/admin-web/**,src/shared/**'
---

# MenuFit Admin Web React Standards

## UI Architecture

- Use feature-oriented folder structure and avoid page-level god components.
- Keep UI components presentational; move orchestration to hooks/services.
- Keep technical admin flows separate from end-user shopping flows.

## State and Data

- Treat backend API as source of truth for operational state.
- Centralize API client logic and error mapping.
- Avoid duplicating domain calculations in UI if backend already owns the rule.

## UX and Quality

- Optimize for fast operator workflows with clear status, retry, and diagnostics.
- Provide explicit loading, empty, and error states for every async screen.
- Keep responsive layouts functional for laptop and tablet breakpoints.

## Testing and Accessibility

- Test critical admin flows (ingest, recompute, sync, diagnostics).
- Add component tests for key state transitions.
- Keep semantic HTML and keyboard navigation intact for core views.
