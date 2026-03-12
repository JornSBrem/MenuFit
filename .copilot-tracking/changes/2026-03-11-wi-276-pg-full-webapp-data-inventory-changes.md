# WI-276 Changes

## Summary
- volledige ingelogde PG webapp-route-inventaris gemaakt
- netwerkverkeer geobserveerd voor recepten, dashboard, favorieten, profiel en weegmomenten
- repo-documentatie toegevoegd met datasets, coverage-status en vervolgimportkandidaten

## Findings
- naast weekmenu en recepten gebruikt PG ook:
  - `GET /api/recipe/favorite`
  - `GET /api/day-menu/favorite`
  - `GET /api/navigation/item`
  - `GET /api/dashboard`
  - `GET /api/user/weight-log?page=1`
  - profiel- en wachtwoordflows rond `/api/me` en `/api/user/password`
- de webapp heeft extra CMS/inspiratie-routes via `#/cms-menu`
- hoogste nog-missende MenuFit datasets zijn voortgang/weegmomenten, favorietenmigratie en CMS-content

## Files
- `docs/PG_WEBAPP_DATA_INVENTORY.md`
- `workitems/workitems.md`

## Verification
- live audit via Playwright tegen `https://app.projectgezond.nl` met authenticated session
- network request capture op meerdere routes
