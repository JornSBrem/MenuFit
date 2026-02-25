<!-- markdownlint-disable-file -->
# Plan: WI-244 iOS boodschappenlijst UX met afvinken, groepering en lokale voortgang

## Scope

Implement practical grocery checklist UX in iOS week flow:
- add check/uncheck interactions per grocery item
- persist checklist progress locally per week + selected household member
- group groceries into readable categories and show open/completed state clearly

Out of scope:
- backend-sourced aisle taxonomy and dynamic store path optimization
- cross-device sync of checklist completion

## Docs Used

- `workitems/workitems.md`
- `src/ios-user-app/App/WeekScreen.swift`
- `src/ios-user-app/App/UserFlowViewModel.swift`

## Success Criteria

- [x] Boodschappenlijst ondersteunt afvinken per item met persistente lokale voortgang.
- [x] Items worden logisch gegroepeerd (bijv. categorie/pad) en tonen duidelijke status open/klaar.

## Tasks

### Phase 1: State and persistence

- [x] Add checklist state storage keyed by member + week.
- [x] Add toggle and progress helpers in viewmodel.

### Phase 2: UI

- [x] Render grouped grocery sections with checkable rows.
- [x] Separate open/completed visibility and show progress summary.

### Phase 3: Validation and tracking

- [x] Run iOS UI tests locally.
- [x] Update tracking artifacts and move WI-244 to done.
