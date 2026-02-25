# Changes: WI-264 Backend endpointimplementatie voor admin data beheercontracten

## Files Created

### `src/backend/application/admin/admin-data-service.ts`
- `AdminDataService`: in-memory CRUD voor recepten, weekmenu's en mapping overrides
- `listRecipes()`, `upsertRecipe()`, `deleteRecipe()` — gesorteerd op title
- `listWeekMenus()`, `upsertWeekMenu()`, `deleteWeekMenu()` — gesorteerd op week+householdId
- `listMappingOverrides()`, `upsertMappingOverride()`, `deleteMappingOverride()` — gesorteerd op sourceKey
- Volledige inputvalidatie met `AdminDataValidationError` (recipeId, slug, title, visibility, week range 1–53, kcal/basePersons/mealCount positief)
- Operation reports per mutatie, traceerbaar via `operationId` en `performedBy`
- Optionele AuditTrailService integratie

### `src/backend/interfaces/http/admin/admin-data-routes.ts`
- Route handlers voor list/upsert/delete per entiteit:
  - `handleListRecipes`, `handleUpsertRecipe`, `handleDeleteRecipe`
  - `handleListWeekMenus`, `handleUpsertWeekMenu`, `handleDeleteWeekMenu`
  - `handleListMappingOverrides`, `handleUpsertMappingOverride`, `handleDeleteMappingOverride`
- Alle handlers vereisen admin sessie (`requireAdminSession`)
- Input validatie op operationId en primaire sleutels

### `src/backend/application/admin/admin-data-service.test.ts`
- 17 tests: upsert/delete/idempotency per entity, sortering, validatiefouten

### `src/backend/interfaces/http/admin/admin-data-routes.test.ts`
- 16 tests: auth guard (user session → forbidden), list/upsert/delete flows, validatiefouten

## Out of scope (→ workitems)

- Persistente DB opslag (WI-225/WI-213)
- Audit history persistentie (WI-262)
- Rendered admin UI componenten voor data beheer (WI-263)
