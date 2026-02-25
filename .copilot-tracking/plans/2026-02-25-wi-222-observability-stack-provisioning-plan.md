<!-- markdownlint-disable-file -->
# Plan: WI-222 Externe observability stack provisioning (Prometheus/Grafana) voor productie

## Scope

Provision external observability stack assets for production operations:
- add versioned Prometheus/Grafana/Alertmanager stack manifests under `infrastructure/`
- configure Prometheus scrape for MenuFit backend observability metrics endpoint
- add Grafana dashboard provisioning for route/security/job oriented backend metrics
- define alert rules for error-rate and blocked-rate and route them to escalation receivers
- document rollout/rollback and required secrets/configuration

Out of scope:
- managed cloud observability service provisioning (vendor-specific Terraform/Bicep)
- long-term metrics retention tuning and multi-cluster federation

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `src/backend/interfaces/http/observability/README.md`
- `infrastructure/README.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Prometheus scrape en Grafana dashboards zijn ingericht voor backend route/security/job metrics.
- [x] Alertregels voor fout- en blocked-rates zijn gekoppeld aan operationele escalatiekanalen.

## Tasks

### Phase 1: Stack provisioning assets

- [x] Add compose-based Prometheus/Grafana/Alertmanager deployment assets with versioned config.
- [x] Add Prometheus scrape + alert rule definitions for MenuFit backend observability metrics.

### Phase 2: Dashboard and alert routing

- [x] Add Grafana datasource/dashboard provisioning for route/security/job visibility.
- [x] Add Alertmanager escalation receiver config (Slack/webhook) wired from environment secrets.

### Phase 3: Validation and tracking

- [x] Add config validation checks/tests for observability assets.
- [x] Update tracking artifacts (`plans`, `changes`, `workitems`) after implementation.
