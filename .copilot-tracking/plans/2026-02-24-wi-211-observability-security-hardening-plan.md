<!-- markdownlint-disable-file -->
# Plan: WI-211 Observability en security hardening voor productie

## Scope

Add production-focused observability and route hardening baselines:
- introduce a telemetry service for HTTP/security counters, dashboard snapshots, and Prometheus export text
- add security policy enforcement for critical admin/system routes:
  - RBAC role gates (operator/owner)
  - request rate limiting
  - lightweight WAF payload pattern blocking
- wire telemetry recording into critical route handlers and expose observability read handlers for operational dashboards/release-gate input

Out of scope:
- external observability stack provisioning (Grafana/Prometheus/Datadog infra)
- network-level WAF/CDN appliance configuration (cloud edge controls)

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Route telemetry can produce dashboard snapshot data and Prometheus-style metrics text.
- [x] Critical admin/system routes enforce RBAC, rate-limiting, and WAF guard checks.
- [x] Tests cover success and blocked paths for telemetry and security controls.

## Tasks

### Phase 1: Observability services

- [x] Add telemetry service + types for request/security counters and release-gate oriented summary snapshots.
- [x] Add route handlers/utilities to expose observability snapshots and Prometheus metrics text.

### Phase 2: Security enforcement

- [x] Add security policy module for RBAC/rate-limit/WAF decisions.
- [x] Integrate security policy and telemetry wiring on critical admin and system mutating routes.

### Phase 3: Validation and tracking

- [x] Add/update tests for telemetry exports and route security enforcement.
- [x] Update tracking artifacts (`plans`, `changes`, `workitems`) after implementation.
