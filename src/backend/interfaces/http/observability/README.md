# Observability Routes

Admin-only observability handlers:

- `snapshot`: structured dashboard payload (route counters + security counters + release-gate input)
- `metrics`: Prometheus text payload for scraping/export pipelines (HTTP/security telemetry + distributed lock event counters)
