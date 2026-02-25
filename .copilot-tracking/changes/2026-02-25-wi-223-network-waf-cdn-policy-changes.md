<!-- markdownlint-disable-file -->
# Release Changes: WI-223 Netwerk-level WAF/CDN policy configuratie voor productie ingress

**Related Plan**: 2026-02-25-wi-223-network-waf-cdn-policy-plan.md
**Implementation Date**: 2026-02-25

## Summary

Added Azure Front Door WAF/CDN policy-as-code assets with OWASP managed baseline rules, custom critical-endpoint rate controls, and scripted deployment/rollback workflow so network-level ingress policy is versioned and reproducible.

## Changes

### Added

- `.copilot-tracking/plans/2026-02-25-wi-223-network-waf-cdn-policy-plan.md`
- `.copilot-tracking/changes/2026-02-25-wi-223-network-waf-cdn-policy-changes.md`
- `infrastructure/environments/waf-cdn/README.md`
- `infrastructure/environments/waf-cdn/azure-frontdoor-waf-policy.bicep`
- `infrastructure/environments/waf-cdn/azure-frontdoor-waf-policy.parameters.example.json`
- `infrastructure/environments/waf-cdn/deploy-azure-frontdoor-waf-policy.sh`
- `infrastructure/environments/waf-cdn/rollback-azure-frontdoor-waf-policy.sh`
- `infrastructure/environments/waf-cdn/waf-cdn-policy-config.test.ts`
- `docs/ops/waf-cdn-policy-runbook.md`

### Modified

- `workitems/workitems.md`
- `infrastructure/environments/README.md`

### Removed

- _none_

## Validation

- `node --test --experimental-strip-types infrastructure/environments/waf-cdn/waf-cdn-policy-config.test.ts`

## Out-of-scope Conversion Check

Reviewed plan out-of-scope items when moving WI-223 to `DONE`:
- Added `WI-232` for full Front Door/CDN topology and certificate provisioning.
- Added `WI-233` for geo/IP allowlist policy tuning per environment/tenant.

## Release Summary

**Total Files Affected**: 11
