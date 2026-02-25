<!-- markdownlint-disable-file -->
# Plan: WI-223 Netwerk-level WAF/CDN policy configuratie voor productie ingress

## Scope

Add deployable network-edge WAF/CDN policy-as-code assets for production ingress:
- define Azure Front Door WAF baseline policy with OWASP managed rules
- add custom rate-limit and match rules for critical MenuFit API endpoint groups
- provide deployment and rollback scripts/documentation with versioned policy artifacts
- add lightweight validation checks to ensure critical endpoint protections remain configured

Out of scope:
- provisioning full Front Door/CDN topology and certificates
- geo/IP allowlists tuned per tenant or country policy

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/best_practices.md`
- `infrastructure/environments/README.md`

## Success Criteria

- [x] Ingress heeft afdwingbare WAF/CDN rulesets voor OWASP-baseline en rate controls op kritieke endpoints.
- [x] Deploybare configuratie is traceerbaar versiebeheer met rollbackpad.

## Tasks

### Phase 1: Policy-as-code assets

- [x] Add Azure Front Door WAF policy Bicep and example parameters for production ingress.
- [x] Add custom rate-limit and block rules targeting critical API route groups.

### Phase 2: Deployment workflow

- [x] Add non-interactive deployment script for create/update of WAF policy resources.
- [x] Add rollback instructions/artifacts for restoring previously known-good policy state.

### Phase 3: Validation and tracking

- [x] Add config validation test coverage for required managed/custom rule presence.
- [x] Update tracking artifacts (`plans`, `changes`, `workitems`) after implementation.
