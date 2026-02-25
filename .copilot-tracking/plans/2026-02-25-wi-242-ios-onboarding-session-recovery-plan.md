<!-- markdownlint-disable-file -->
# Plan: WI-242 iOS eerste-keer onboarding en sessie-herstel flow

## Scope

Implement a first-run authentication gate in the iOS app that prevents technical API errors for missing/expired sessions and provides explicit user actions:
- add onboarding/session setup screen when no valid session exists
- add explicit session refresh flow when stored session is expired
- gate main tab flow behind valid session and bootstrap data load only after successful setup
- update UITest smoke flow to handle onboarding state deterministically

Out of scope:
- OAuth/OpenID provider integration (covered by WI-220)
- server-driven refresh token exchange

## Docs Used

- `workitems/workitems.md`
- `src/ios-user-app/App/*.swift`
- `src/ios-user-app/UITests/MenuFitUserAppUITests.swift`
- `src/ios-user-app/README.md`

## Success Criteria

- [x] Nieuwe gebruiker krijgt een duidelijke onboarding/login-startflow i.p.v. technische foutstatussen.
- [x] Bestaande gebruiker krijgt sessie-herstel/refresh UX met expliciete actie bij verlopen sessie.

## Tasks

### Phase 1: Auth gate domain/viewmodel

- [x] Add session-state evaluation and onboarding draft management in auth/viewmodel layer.
- [x] Add actions for start session, refresh session, and clear session.

### Phase 2: UI integration

- [x] Add onboarding/session-recovery SwiftUI screen and route app root through auth gate.
- [x] Keep existing tabbed app flow unchanged once session is valid.

### Phase 3: Validation and tracking

- [x] Update iOS UI smoke test to pass through onboarding when shown.
- [x] Run iOS UI tests locally.
- [x] Update tracking artifacts (`plans`, `changes`, `workitems`) and move WI-242 to done.
