<!-- markdownlint-disable-file -->
# Plan: WI-243 iOS weekmenu als primaire home-flow

## Scope

Implement weekmenu-first behavior in iOS app:
- show weekmenu context first for logged-in user
- keep today's day menu as default focus
- allow household member switching from linked member list
- support week-to-week navigation in the same screen

Out of scope:
- backend member-specific menu filtering per selected household member
- advanced drag-and-drop week planner editing

## Docs Used

- `workitems/workitems.md`
- `src/ios-user-app/App/*.swift`
- `src/backend/application/gold/*.ts`

## Success Criteria

- [x] Bij openen/login wordt altijd het weekmenu van de ingelogde gebruiker geladen met het menu van vandaag als default focus.
- [x] Gebruiker kan vanuit de home/menubalk wisselen naar gekoppelde gezinsleden door op naam te klikken.
- [x] Gebruiker kan soepel navigeren naar vorige/volgende weekmenu's zonder verlies van geselecteerde persoon.

## Tasks

### Phase 1: Data shape and state

- [x] Extend read models for week summary to carry meal entries.
- [x] Add iOS state for selected household member and selected day.

### Phase 2: UI flow

- [x] Redesign week screen with household member switcher and week navigation controls.
- [x] Add day menu section with today-focused default and day switching.

### Phase 3: Validation and tracking

- [x] Update UI smoke tests for revised week-screen layout.
- [x] Run iOS UI tests locally.
- [x] Update tracking artifacts and move WI-243 to done.
