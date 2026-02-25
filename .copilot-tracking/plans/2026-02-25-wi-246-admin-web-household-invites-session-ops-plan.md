<!-- markdownlint-disable-file -->
# Plan: WI-246 Admin web operationele UI voor huishoudens/invites/sessiestatus

## Scope

Add operator-facing household/session operations in admin-web application layer:
- load household status and invitation lists with household filter
- add support actions for invite resend and session reset
- add session diagnostics retrieval and state presentation in operations view-model

Out of scope:
- fully rendered browser UI pages/components (current module is controller/API contract layer)
- persisted server-side audit timeline UI

## Docs Used

- `workitems/workitems.md`
- `src/admin-web/src/*.ts`
- `src/admin-web/src/admin-dashboard-controller.test.ts`

## Success Criteria

- [x] Admin kan huishoudens, uitnodigingen en sessiestatus inzien en gericht filteren.
- [x] Kritieke support-acties (opnieuw uitnodigen, status reset, sessiediagnose) zijn veilig uitvoerbaar met audit trail.

## Tasks

### Phase 1: Contracts

- [x] Extend admin-web types and API client with household/session operation contracts.

### Phase 2: Controller behavior

- [x] Add operations view loading for household status + invitations.
- [x] Add controller actions for invite resend, session reset, and session diagnostics.

### Phase 3: Validation and tracking

- [x] Extend controller tests for household/session operations.
- [x] Run admin-web tests locally.
- [x] Update tracking artifacts and move WI-246 to done.
