# External Observability Stack (WI-222)

Versioned production observability assets for MenuFit backend:

- Prometheus scrape + alert rules
- Alertmanager escalation routing (Slack + webhook)
- Grafana datasource and dashboard provisioning
- Distributed lock event visibility (`menufit_lock_events_total`) for contention monitoring

## Files

- `docker-compose.observability.yml`: stack composition for Prometheus, Alertmanager, Grafana.
- `prometheus/prometheus.yml`: scrape config against MenuFit observability metrics endpoint.
- `prometheus/alerts/menufit-alerts.yml`: alert rules for error-rate and blocked-rate.
- `alertmanager/alertmanager.yml`: escalation routing to operations channels.
- `grafana/provisioning/**`: datasource/dashboard auto-provisioning.
- `grafana/dashboards/menufit-backend-observability.json`: backend route/security/job dashboard.

## Prerequisites

1. Create `infrastructure/observability/secrets/menufit_observability_token` with a valid admin bearer token for `/api/v3/observability/metrics`.
2. Create `infrastructure/observability/secrets/slack_webhook_url` with a Slack incoming webhook URL.
3. Copy `.env.example` to `.env` and set:
   - `GRAFANA_ADMIN_USER`
   - `GRAFANA_ADMIN_PASSWORD`
   - `ALERT_SLACK_CHANNEL`
   - `ALERT_WEBHOOK_URL`

## Start

```bash
cd infrastructure/observability
docker compose --env-file .env -f docker-compose.observability.yml up -d
```

## Rollout and Rollback

Rollout:

1. Commit and push config changes.
2. Apply on target host with `docker compose pull` and `up -d`.
3. Verify targets and rules:
   - Prometheus targets healthy (`/targets`)
   - Alert rules loaded (`/rules`)
   - Grafana dashboard and datasource provisioned.

Rollback:

1. Checkout previous known-good commit.
2. Re-run `docker compose --env-file .env -f docker-compose.observability.yml up -d`.
3. Confirm Prometheus rule group and Grafana dashboard versions reverted.

## Operational Verification

- Prometheus query for ingestion:
  - `sum(rate(menufit_http_requests_total[5m]))`
- Error-rate signal:
  - `100 * (sum(rate(menufit_http_requests_total{outcome=~"client_error|server_error"}[5m])) / clamp_min(sum(rate(menufit_http_requests_total[5m])), 1))`
- Blocked-rate signal:
  - `100 * (sum(rate(menufit_http_requests_total{outcome=~"forbidden|rate_limited|waf_blocked"}[5m])) / clamp_min(sum(rate(menufit_http_requests_total[5m])), 1))`
- Lock contention signal:
  - `sum(rate(menufit_lock_events_total{event=~"timeout|renew_failed"}[5m]))`
