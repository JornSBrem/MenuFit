<!-- markdownlint-disable-file -->
# Plan: WI-249 Admin web data beheerpanelen voor recepten, weekmenu's en mapping overrides

## Scope

Add admin-web application-layer workflows for core product data management:
- define typed API contracts for recipes, week menus, and mapping overrides
- expose controller actions to load lists and execute upsert/delete workflows
- keep admin data view synchronized after successful writes so operators can verify immediate impact

Out of scope:
- rendered browser pages/forms/tables for these data entities
- backend persistence/query implementation for the new admin data endpoints

## Docs Used

- `workitems/workitems.md`
- `src/admin-web/src/types.ts`
- `src/admin-web/src/admin-api.ts`
- `src/admin-web/src/admin-dashboard-controller.ts`
- `src/admin-web/src/admin-dashboard-controller.test.ts`

## Success Criteria

- [x] Web-app ondersteunt CRUD/workflows voor kernentiteiten (recepten, weekmenu's, mapping overrides) met veilige validatieregels.
- [x] Wijzigingen zijn direct zichtbaar in user flow of via expliciete publish/recompute stap met traceerbare status.

## Tasks

### Phase 1: Contracts

- [x] Extend types + API client with recipe/week-menu/mapping-override list and mutate contracts.

### Phase 2: Controller behavior

- [x] Add data management load action for recipes, week menus, and mapping overrides.
- [x] Add upsert/delete actions that update local data state after successful operation report.

### Phase 3: Validation + tracking

- [x] Extend controller tests for end-to-end data management workflows.
- [x] Run admin-web tests locally.
- [x] Update workitem tracking and out-of-scope conversion.
