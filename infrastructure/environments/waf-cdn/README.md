# WAF/CDN Policy-as-Code (WI-223)

Azure Front Door WAF policy assets for network-level ingress protection.

## Included Assets

- `azure-frontdoor-waf-policy.bicep`
  - OWASP managed rules via `Microsoft_DefaultRuleSet` and bot protection rules.
  - Custom rate-limit rule for critical API paths.
  - Optional association to Front Door security policy.
- `azure-frontdoor-waf-policy.parameters.example.json`
  - Example production parameter file.
- `deploy-azure-frontdoor-waf-policy.sh`
  - Non-interactive deployment command wrapper.
- `rollback-azure-frontdoor-waf-policy.sh`
  - Rollback wrapper to redeploy a known-good parameters set.

## Critical Endpoint Coverage

Custom rate-limiting and query filtering covers:

- `/api/v3/admin/*`
- `/api/v3/system/*`
- `/api/v3/auth/*`
- `/api/v3/observability/*`

## Deploy

```bash
chmod +x infrastructure/environments/waf-cdn/*.sh
infrastructure/environments/waf-cdn/deploy-azure-frontdoor-waf-policy.sh \
  <resource-group> \
  infrastructure/environments/waf-cdn/azure-frontdoor-waf-policy.parameters.example.json
```

## Rollback

1. Restore previous known-good parameter values from git history.
2. Redeploy policy with explicit rollback deployment name:

```bash
infrastructure/environments/waf-cdn/rollback-azure-frontdoor-waf-policy.sh \
  <resource-group> \
  <known-good-parameters-file> \
  menufit-waf-rollback-<yyyymmddhhmm>
```

3. Validate associated Front Door security policy still references intended domains and patterns.
