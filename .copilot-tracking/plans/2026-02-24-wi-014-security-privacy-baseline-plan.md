<!-- markdownlint-disable-file -->
# Plan: WI-014 Security/privacy baseline

## Scope

Implement a practical security/privacy baseline for current backend foundations:
- secret handling through env values and file-based secret references
- stricter auth parsing with optional token expiry validation
- centralized audit trail records for critical mutations and match/sync decisions

Out of scope:
- full OAuth/JWT identity provider integration
- persistent encrypted audit storage
- production WAF/rate-limiting infrastructure setup

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/best_practices.md`

## Success Criteria

- [x] Secrets are loaded from env/secret file references without hardcoded credentials.
- [x] Auth parser supports secure token expiry checks for bearer sessions.
- [x] Audit trail includes critical mutation and match/sync decision events.

## Tasks

### Phase 1: Secret and auth hardening

- [x] Add backend secret resolver for `*_FILE` environment variables.
- [x] Integrate secret resolver into runtime config creation.
- [x] Extend session auth parsing with optional expiry validation.

### Phase 2: Audit trail baseline

- [x] Add central in-memory audit trail service with redaction safeguards.
- [x] Wire audit events into admin, system, matching, and cart services.

### Phase 3: Validation and tracking

- [x] Add/update tests for secret resolution, auth expiry, and audit event generation.
- [x] Update WI-014 tracking artifacts and mark workitem status.
