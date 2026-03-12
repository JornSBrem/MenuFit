# PG Webapp Data Inventory

Datum audit: 11 maart 2026  
Bron: ingelogde sessie in `https://app.projectgezond.nl`

## 1. Route inventory

Hoofdroutes gevonden in de ingelogde webapp:

- `#/`
- `#/week-menu`
- `#/recepten`
- `#/mijn-pg`
- `#/cms-menu`
- `#/pagina/favorieten`
- `#/pagina/kcal`
- `#/pagina/kcal-berekenen`
- `#/pagina/weegmomenten`
- `#/pagina/bmi`
- `#/pagina/persoonlijke-gegevens`
- `#/pagina/wachtwoord-wijzigen`

Extra CMS/informatie-routes zichtbaar vanuit `#/cms-menu`:

- `#/pagina/zo-gebruik-je-project-gezond`
- `#/pagina/veelgestelde-vragen`
- `#/pagina/bonusmenus`
- `#/pagina/kruidenmixen`
- `#/pagina/variatielijst`

## 2. Backend/API calls observed

Direct geobserveerd via network requests of eerder bevestigde routeprobes:

### Auth / user context

- `POST /api/login`
- `GET /api/me`
- `PUT /api/me`  
  Inferred from personal data flow and earlier JS bundle inspection.
- `PUT /api/user/password`  
  Inferred from password change flow and earlier JS bundle inspection.

### Navigation / dashboard

- `GET /api/navigation/item`
- `GET /api/dashboard`
- `GET /api/v3/dashboard`
- `GET /api/pdf-download/{uuid}`
- `GET /api/dashboard/pdf/{kcal}`  
  Confirmed from earlier JS bundle inspection.

### Recipes

- `GET /api/recipe/filter`
- `GET /api/recipe/{slug}`
- `GET /api/recipe/{id}/comments?page=0`
- `GET /api/recipe/favorite`
- `POST https://bv9qsku6j9-dsn.algolia.net/1/indexes/recipe_index/query`

### Week and day menus

- `GET /api/week-menu/{week}`
- `GET /api/day-menu/favorite`

### Progress / profile

- `GET /api/user/weight-log?page=1`
- `POST /api/user/weight-log`  
  Confirmed from earlier JS bundle inspection.
- `DELETE /api/user/weight-log/{id}`  
  Confirmed from earlier JS bundle inspection.
- `DELETE /api/user/weight-log/destroy-all`  
  Confirmed from earlier JS bundle inspection.

### Password / recovery

- `POST /api/password/email`  
  Confirmed from earlier JS bundle inspection.

### Registration

- `POST /api/register`  
  Confirmed from earlier JS bundle inspection.

## 3. Dataset inventory

### Already covered in MenuFit

- week menus
- embedded groceries per week
- recipe detail:
  - intro
  - ingredients
  - steps
  - tips
  - nutrition
  - prep times
  - linked day menus
  - tags

### Partially covered

- recipe favorites  
  MenuFit has local favorites UI, but does not import/sync PG `recipe/favorite`.
- profile / personal data  
  MenuFit has its own profile model and edit flow, but not PG parity for all fields such as start weight, target weight, start date.

### Not yet covered in MenuFit

- day-menu favorites via `/api/day-menu/favorite`
- progress dashboard data from `/api/dashboard`
- weight history / weigh-ins via `/api/user/weight-log`
- CMS/inspiration content:
  - FAQ
  - how-to
  - bonus menus
  - kruidenmixen
  - variatielijst
- password change parity
- recipe comments
- dashboard/pdf and other document-style outputs

## 4. Product interpretation

### High-value import candidates

1. Progress and weight log
- directly supports `Mijn PG` and `Mijn weegmomenten`
- user value is high
- data shape appears straightforward and API-backed

2. Day-menu favorites
- useful if MenuFit wants to preserve curated meal-plan shortcuts from PG

3. CMS/inspiration pages
- useful as static content import
- lower urgency than progress and recipes

4. Recipe favorites sync
- only relevant if MenuFit should migrate existing PG personal state into local MenuFit state

### Lower-value / optional candidates

- recipe comments
- password-recovery style flows
- install-PWA affordance
- analytics/support tooling

## 5. MenuFit coverage status

Current MenuFit parity after WI-271 and WI-274:

- recipes: strong coverage
- week menu: strong coverage
- groceries: strong coverage
- local recipe browsing/filtering: improved, now closer to PG webapp
- progress/weegmomenten: still missing
- CMS/inspiration: missing
- PG personal-state migration (favorites/day-menu favorites): missing

## 6. Follow-up work

Relevant follow-up workitems created from this audit:

- `WI-275` — persoonlijke voortgang en weegmomenten in MenuFit uitwerken
- `WI-277` — PG favorieten en dagmenu-favorieten migreren naar lokale MenuFit state
- `WI-278` — PG CMS/inspiratie-content inventariseren en lokaal serveren in MenuFit
