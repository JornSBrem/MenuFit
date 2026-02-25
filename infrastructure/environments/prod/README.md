# Production Cloud Provisioning (WI-224)

Versioned Azure production infrastructure baseline for MenuFit.

## Provisioned Baseline

- Compute: Azure Container Apps environment + backend app.
- Network: dedicated virtual network and delegated Container Apps subnet.
- Secrets: Azure Key Vault (RBAC enabled).
- Observability: Log Analytics workspace + Application Insights.
- Storage: secure Storage Account for persistent runtime artifacts.
- Edge basis: Azure Front Door profile resource for production ingress.

## Files

- `main.bicep`: core production infrastructure template.
- `main.parameters.example.json`: example production parameters.
- `deploy-prod-infra.sh`: non-interactive deployment wrapper.
- `validate-prod-infra.sh`: post-deploy resource validation checks.
- `rollback-prod-infra.sh`: rollback wrapper for redeploying known-good parameters.
- `postgres/`: Postgres runtime provisioning assets and operational setup scripts.
- `redis/`: Redis provisioning assets for external distributed lock backend.

## Deploy

```bash
chmod +x infrastructure/environments/prod/*.sh
infrastructure/environments/prod/deploy-prod-infra.sh \
  <resource-group> \
  infrastructure/environments/prod/main.parameters.example.json
```

## Validate

```bash
infrastructure/environments/prod/validate-prod-infra.sh <resource-group> menufit-prod
```

## Rollback-safe Path

1. Select known-good infra template + parameters from git history.
2. Redeploy with explicit rollback deployment name:

```bash
infrastructure/environments/prod/rollback-prod-infra.sh \
  <resource-group> \
  <known-good-parameters-file> \
  menufit-prod-rollback-<yyyymmddhhmm>
```

3. Re-run `validate-prod-infra.sh` to confirm required baseline resources are present.

## Notes

- Database engine provisioning for Postgres runtime is implemented under `postgres/`.
- Automated sqlite-to-postgres live migration remains out of scope and is tracked separately.
