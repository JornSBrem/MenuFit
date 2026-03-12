<!-- markdownlint-disable-file -->
# Plan: WI-280 Supabase + iOS admin architecture

## Scope

Produce a target architecture for moving MenuFit toward Supabase-backed auth/roles and gold-data storage, while replacing the separate admin web portal with an admin mode inside the iOS app. The output is a concrete architecture and migration plan, not a big-bang implementation.

In scope:
- Supabase Auth and role model for normal and admin users.
- Recommended storage split for bronze, silver and gold data.
- iOS admin mode entry point and boundary design.
- Migration phases and follow-up workitems.

Out of scope:
- Implementing the schema migration itself.
- Replacing the full import pipeline in this workitem.
- Shipping the iOS admin mode UI in this workitem.
- Removing the existing admin web app immediately.

## Success Criteria

- [ ] Target architecture is documented in-repo.
- [ ] The document makes a clear storage decision for bronze/silver/gold.
- [ ] The document defines the Supabase role model and admin gating strategy in iOS.
- [ ] The document results in concrete follow-up workitems.

## Tasks

### Phase 1: Preparation

- [ ] Add WI-280 to backlog and mark it `IN-PROGRESS`.
- [ ] Re-read the current architecture documents relevant to storage and frontend split.

### Phase 2: Design

- [ ] Write a target architecture document for Supabase-backed auth and gold storage.
- [ ] Define the recommended treatment of bronze/silver data and operational boundaries.
- [ ] Define the iOS admin mode flow and backend responsibilities.

### Phase 3: Tracking

- [ ] Create follow-up workitems for implementation phases.
- [ ] Write the changes file and move WI-280 to `DONE`.
