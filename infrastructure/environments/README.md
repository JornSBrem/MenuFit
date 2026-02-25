# Environment Profiles

Planned profiles:

- `local`: compose/self-hosted development.
- `prod`: internet-facing backend with TLS and managed services.

For production observability stack provisioning, use assets in `infrastructure/observability/`.
For production ingress edge policy provisioning, use assets in `infrastructure/environments/waf-cdn/`.
For production cloud infrastructure baseline provisioning, use assets in `infrastructure/environments/prod/`.
For production Postgres runtime setup, use assets in `infrastructure/environments/prod/postgres/`.

Add profile-specific manifests in this folder.

## Branch Protection Policy-as-Code (WI-212)

- `branch-protection.main.json`: required guardrails for `main`.
- `apply-branch-protection.sh`: applies policy via GitHub REST API.

Apply example:

```bash
GH_TOKEN=<github-token> \
GH_REPO=<owner/repo> \
./infrastructure/environments/apply-branch-protection.sh main infrastructure/environments/branch-protection.main.json
```

Recommended required status checks in policy:

- `backend-quality`
- `live-contract-validation`
- `ios-ui-smoke`
