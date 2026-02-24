# Request Security Policy

Security gate for critical routes:

- role-based route authorization (`operator`/`owner`)
- per-route actor rate limiting
- lightweight WAF payload pattern blocking

Designed to be composed inside route handlers and emit telemetry security events.
