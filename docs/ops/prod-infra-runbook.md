# Production Infrastructure Runbook

## Deploy

1. Prepare a reviewed parameters file for the target resource group.
2. Deploy infrastructure:

```bash
infrastructure/environments/prod/deploy-prod-infra.sh <resource-group> <parameters-file>
```

3. Validate baseline resources:

```bash
infrastructure/environments/prod/validate-prod-infra.sh <resource-group> menufit-prod
```

## Rollback

1. Identify known-good template and parameters from git history.
2. Execute rollback deployment:

```bash
infrastructure/environments/prod/rollback-prod-infra.sh \
  <resource-group> \
  <known-good-parameters-file> \
  menufit-prod-rollback-<yyyymmddhhmm>
```

3. Re-run validation and verify backend ingress endpoint health.
