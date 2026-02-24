# PG Endpoint Contract (V3)

Dit document legt de Project Gezond endpoint-contracten vast die V3 gebruikt.

Bron van waarheid:
- huidige configuratie in `.env` / `.env.example`
- huidige adaptergebruik in de bestaande app

## 1. Auth

1. Login
- Key: `PG_LOGIN_URL`
- Default: `https://backend.projectgezond.nl/api/login`
- Doel: ophalen/vernieuwen van auth context voor PG requests.

## 2. Data endpoints (template-based)

1. Week menu
- Key: `PG_WEEK_URL_TEMPLATE`
- Default: `https://backend.projectgezond.nl/api/v3/week-menus/{week}`
- Parameters:
- `{week}` (1-53)
- Verwacht: weekmenu payload + groceries data.

2. Day menu
- Key: `PG_DAY_URL_TEMPLATE`
- Default: `https://backend.projectgezond.nl/api/v3/daymenus/{dayId}`
- Parameters:
- `{dayId}`
- Verwacht: details per dag/maaltijd.

3. Recipe detail
- Key: `PG_RECIPE_URL_TEMPLATE`
- Default: `https://backend.projectgezond.nl/api/v3/recipes/{recipeId}`
- Parameters:
- `{recipeId}`
- Verwacht: receptdetail inclusief ingredienten/stappen/media.

4. Shopping list source
- Key: `PG_SHOPPINGLIST_URL_TEMPLATE`
- Default: `https://backend.projectgezond.nl/api/v3/week-menus/{week}`
- Parameters:
- `{week}` (1-53)
- Opmerking: huidige bron levert groceries via weekmenu payload (`data.groceries`).

## 3. Overige configuratie

1. App origin
- Key: `PG_APP_ORIGIN`
- Default: `https://app.projectgezond.nl`

2. Media origin
- Key: `PG_MEDIA_URL`
- Default: `https://new.backend.projectgezond.nl`

3. Extra headers
- Key: `PG_EXTRA_HEADERS_JSON`
- Voorbeeld default: `{"X-Requested-With":"XMLHttpRequest"}`

## 4. Contractregels

1. V3 gebruikt dezelfde endpointfamilie als V1/V2.
2. Endpoint wijzigingen moeten eerst hier worden bijgewerkt.
3. Adapter contract tests moeten op deze lijst gebaseerd zijn.
4. Breaking changes in response shape verhogen `schemaVersion` in bronze metadata.

