<!-- markdownlint-disable-file -->
# Plan: WI-248 Admin web configuratiepanel met runtime settings, validatie en audit

## Scope

Deliver application-layer behavior for runtime config management in admin-web:
- enforce a controlled allowlist for editable runtime setting keys
- validate incoming value types before calling backend update API
- expose in-memory settings state and audit trail metadata (`who/when/what`)
- keep settings view synchronized after successful config updates

Out of scope:
- rendered browser UI components/forms for settings editing
- persistent backend storage/query API for settings audit history

## Docs Used

- `workitems/workitems.md`
- `src/admin-web/src/admin-dashboard-controller.ts`
- `src/admin-web/src/admin-dashboard-controller.test.ts`

## Success Criteria

- [x] Web-app toont configureerbare runtime-instellingen met duidelijke validatie en foutafhandeling.
- [x] Wijzigingen worden versieerbaar/auditbaar vastgelegd inclusief wie/wanneer/wat.

## Tasks

### Phase 1: Validation + state

- [x] Add runtime config allowlist + type validation in controller update flow.
- [x] Keep settings state updated only after successful config operation.

### Phase 2: Audit trail

- [x] Add settings audit trail entries with actor, timestamp, value, and operation id.
- [x] Include audit trail in settings view payload.

### Phase 3: Verification + tracking

- [x] Add controller tests for invalid key/value and audit trail behavior.
- [x] Run admin-web tests locally.
- [x] Update workitem tracking artifacts.
