<!-- markdownlint-disable-file -->
# Plan: WI-210 iOS productionization met Xcode project, token-auth en uitgebreide match-flow

## Scope

Productionize the iOS user app baseline by improving project configuration, token-auth usage, and match workflow integration:
- update iOS project configuration for team development signing readiness
- add user token session handling in the app and attach bearer auth headers on backend calls
- expand backend API client + models with `/api/v3/match/*` endpoints
- extend view-model and Match screen to execute evaluate/queue/review flows from the app
- update docs and validate with simulator build

Out of scope:
- full OAuth/OpenID provider authorization-code login flow (covered by `WI-220`)
- cryptographic JWT signature validation and JWKS rotation in the app/backend integration (covered by `WI-221`)

## Docs Used

- `docs/APP_V3_MEDALLION_BLUEPRINT.md`
- `docs/best_practices.md`
- `src/ios-user-app/README.md`

## Success Criteria

- [x] Xcode project and signing settings are documented and configured for team development handoff.
- [x] iOS backend calls use bearer token authorization from app session state.
- [x] Match flow supports evaluate, queue refresh, and review actions (`map`, `skip`, `defer`) from the app.

## Tasks

### Phase 1: Project/auth productionization

- [x] Update project settings/docs for team signing readiness.
- [x] Add app-level auth session/token store and wire token provider into backend client.

### Phase 2: Match flow integration

- [x] Add match endpoint contracts to iOS models/API client.
- [x] Extend view-model with match evaluate/queue/review actions.
- [x] Update Match screen UI with interactive match controls and result rendering.

### Phase 3: Validation and tracking

- [x] Run simulator build validation.
- [x] Update tracking artifacts (`plans`, `changes`, `workitems`) after implementation.
