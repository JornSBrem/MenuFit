# Plan: WI-264 Backend endpointimplementatie voor admin data beheercontracten

## Scope

In scope:
- AdminDataService: in-memory CRUD voor recepten, weekmenu's en mapping overrides
- Route handlers: list/upsert/delete per entity type, beveiligd met admin sessie check
- Input validatie + AdminDataValidationError
- Operation reports traceerbaar naar admin-web flows
- Unit tests

Out of scope:
- Persistente opslag naar DB (Postgres/SQLite — zie WI-225/WI-213)
- Audit history persistentie (zie WI-262)

## Tasks

- [x] `src/backend/application/admin/admin-data-service.ts`
- [x] `src/backend/application/admin/admin-data-service.test.ts`
- [x] `src/backend/interfaces/http/admin/admin-data-routes.ts`
- [x] `src/backend/interfaces/http/admin/admin-data-routes.test.ts`
