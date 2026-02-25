<!-- markdownlint-disable-file -->
# Plan: WI-245 iOS bestelflow UX met pre-flight validatie en bevestiging

## Scope

Improve ordering UX in iOS flow:
- add pre-flight summary before sync execution
- present explicit success/warning/error confirmation state after sync
- add clear recovery action for partial failures

Out of scope:
- provider-specific retry orchestration per failed line item
- automatic background retry scheduling

## Docs Used

- `workitems/workitems.md`
- `src/ios-user-app/App/OrderScreen.swift`
- `src/ios-user-app/App/UserFlowViewModel.swift`

## Success Criteria

- [x] Voor sync ziet gebruiker een samenvatting/controlepunt (items, unresolved, verwachte actie).
- [x] Na sync krijgt gebruiker een duidelijke bevestigingsstatus met herstelactie bij gedeeltelijke failure.

## Tasks

### Phase 1: Flow state

- [x] Add pre-flight and post-sync status helpers in viewmodel.

### Phase 2: UI

- [x] Add pre-flight validation section in order screen.
- [x] Add explicit post-sync status block with retry/recovery action.

### Phase 3: Validation and tracking

- [x] Run iOS UI tests locally.
- [x] Update tracking artifacts and move WI-245 to done.
