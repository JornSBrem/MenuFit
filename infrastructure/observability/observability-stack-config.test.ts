import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), "infrastructure/observability", relativePath), "utf8");

test("prometheus config scrapes menufit observability metrics endpoint", () => {
  const config = read("prometheus/prometheus.yml");
  assert.match(config, /job_name:\s+menufit-backend/);
  assert.match(config, /metrics_path:\s+\/api\/v3\/observability\/metrics/);
  assert.match(config, /credentials_file:\s+\/etc\/prometheus\/secrets\/menufit_observability_token/);
});

test("alert rules include error-rate and blocked-rate thresholds", () => {
  const rules = read("prometheus/alerts/menufit-alerts.yml");
  assert.match(rules, /alert:\s+MenuFitHighHttpErrorRate/);
  assert.match(rules, /alert:\s+MenuFitHighBlockedRate/);
  assert.match(rules, /client_error\|server_error/);
  assert.match(rules, /forbidden\|rate_limited\|waf_blocked/);
});

test("alertmanager escalation receiver routes to slack and webhook channels", () => {
  const config = read("alertmanager/alertmanager.yml");
  assert.match(config, /receiver:\s+operations-escalation/);
  assert.match(config, /slack_configs:/);
  assert.match(config, /webhook_configs:/);
  assert.match(config, /api_url_file:\s+\/etc\/alertmanager\/secrets\/slack_webhook_url/);
  assert.match(config, /url:\s+\$\{ALERT_WEBHOOK_URL\}/);
});

test("grafana provisioning includes backend observability dashboard", () => {
  const dashboard = read("grafana/dashboards/menufit-backend-observability.json");
  assert.match(dashboard, /MenuFit Backend Observability/);
  assert.match(dashboard, /menufit_http_requests_total/);
  assert.match(dashboard, /menufit_security_events_total/);
  assert.match(dashboard, /Job and Operations Route Throughput/);
});
