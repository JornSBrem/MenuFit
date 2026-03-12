<!-- markdownlint-disable-file -->
# Plan: wi-276-pg-full-webapp-data-inventory

## Scope

Audit the authenticated ProjectGezond web app for all reachable pages and underlying data calls, then capture the resulting data inventory in a form MenuFit can use for follow-up import work. Out of scope are full implementations for every newly discovered dataset in this slice; those become explicit follow-up work where needed.

## Success Criteria

- [ ] Authenticated web app routes and feature areas are inventoried beyond the already-known recipe/week flows.
- [ ] Network/API calls behind those routes are captured and classified by dataset type.
- [ ] Repo artifacts document discovered datasets, current MenuFit coverage, and next import candidates.

## Tasks

### Phase 1: Route and Network Discovery

- [ ] Traverse reachable authenticated ProjectGezond pages and capture route inventory.
- [ ] Capture network requests and identify backend/third-party data sources per page.

### Phase 2: Classification

- [ ] Group discovered endpoints by domain area such as recipes, progress, profile, contact, CMS, PDFs, and support data.
- [ ] Compare discovered datasets with current MenuFit coverage and identify gaps.

### Phase 3: Tracking

- [ ] Persist findings in repo documentation and/or helper scripts.
- [ ] Convert uncovered relevant datasets into backlog items for import or product work.
