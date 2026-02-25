# WAF/CDN Policy Runbook

## Deploy Validation

1. Confirm Azure deployment succeeded with no failed operations.
2. Verify Front Door security policy association targets expected custom domains.
3. Execute smoke checks on protected endpoints and validate normal traffic is not blocked unexpectedly.
4. Simulate abusive request rate against `/api/v3/admin/*` from a test source and confirm WAF rate-limit enforcement.

## Rollback Procedure

1. Identify previous known-good parameter set in git history.
2. Execute rollback script:

```bash
infrastructure/environments/waf-cdn/rollback-azure-frontdoor-waf-policy.sh \
  <resource-group> \
  <known-good-parameters-file> \
  menufit-waf-rollback-<yyyymmddhhmm>
```

3. Re-validate endpoint availability and expected WAF behavior.
4. Record incident timeline and root-cause notes in operations log.
