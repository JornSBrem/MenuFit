<!-- markdownlint-disable-file -->
# Plan: wi-274-pg-webapp-parity

## Scope

Inspect the live ProjectGezond web app with an authenticated session, compare its current end-user functionality to the MenuFit iOS experience, and implement the highest-value missing parity item that can run entirely on MenuFit-owned data. Out of scope for this slice are features that still depend on proprietary ProjectGezond backend behavior we do not mirror yet, and broad redesign work unrelated to parity findings.

## Success Criteria

- [ ] Live ProjectGezond routes and user-facing features are inventoried from an authenticated browser session.
- [ ] Concrete parity gaps are mapped against the current MenuFit iOS app and backlog.
- [ ] At least one missing parity feature that is feasible on local MenuFit data is implemented and validated.

## Tasks

### Phase 1: Audit

- [ ] Log into the live ProjectGezond web app and inspect major user flows/screens.
- [ ] Compare discovered functionality with the current MenuFit tabs/screens and identify gaps.

### Phase 2: Implementation

- [ ] Select the highest-value parity gap that can run on MenuFit-owned data.
- [ ] Implement the feature in MenuFit and adjust data/UI contracts as needed.

### Phase 3: Validation

- [ ] Run targeted validation for the changed surface and document residual gaps.
- [ ] Convert remaining relevant parity gaps into explicit backlog items.
