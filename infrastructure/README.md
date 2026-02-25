# Infrastructure Boundary

`infrastructure` stores deployment and environment artifacts for:

- local/dev profile
- online/prod profile

Keep environment-specific concerns here, separate from domain code.

Current infrastructure modules:

- `release-gates/`: KPI and live-contract gate checks used by CI.
- `environments/`: environment policy assets (for example branch protection).
- `observability/`: external Prometheus/Grafana/Alertmanager stack provisioning assets.
