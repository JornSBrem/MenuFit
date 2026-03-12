<!-- markdownlint-disable-file -->
# Supabase + iOS Admin Target Architecture

## 1. Beslissing

MenuFit beweegt naar de volgende doelarchitectuur:

1. `Supabase Auth` wordt de primaire identity provider voor alle gebruikers en admins.
2. `Supabase Postgres` wordt de primaire opslag voor `gold` productdata en gebruikersdata.
3. De aparte admin-webapp wordt gefaseerd vervangen door een `admin mode` in de iOS app.
4. De bestaande backend blijft bestaan als orchestratie- en importlaag.
5. `bronze` en `silver` blijven operationele lagen en worden niet blind als primaire runtime-tabellen in Supabase ondergebracht.

Dit is nadrukkelijk geen advies om direct alles naar Supabase te verplaatsen. De juiste knip is:
- `auth + roles` naar Supabase
- `gold` naar Supabase
- `bronze/silver` alleen opslaan waar operationeel nodig

## 2. Waarom deze richting verdedigbaar is

De huidige complexiteit komt uit drie overlappende assen:
- lokale backend-state als eigen source of truth
- Supabase voor auth, maar niet voor alle autorisatie- en productdata
- een aparte admin-webapp naast de iOS app

Dat levert frictie op:
- meerdere sessiemodellen
- meerdere rollenbronnen
- dubbele beheeroppervlakken
- verwarring over wat persistent blijft na restart of redeploy

De doelarchitectuur reduceert dat naar:
- één identity model
- één rolmodel
- één primaire serving store voor appdata
- één hoofdapp met gescheiden user mode en admin mode

## 3. Doelverdeling per laag

## 3.1 Auth en rollen

### Doel

Alles rond authenticatie en roltoekenning komt uit Supabase.

### Model

- `Supabase Auth user` is de canonieke user identity.
- Admin-zichtbaarheid wordt bepaald door claims in de JWT.
- Bron voor die claims:
  - primair: `app_metadata.role`
  - optioneel aanvullend: namespaced claim zoals `menufit:role`

### Ondersteunde rollen

- `user`
- `operator`
- `owner`

### Regels

- Alleen `operator` en `owner` zien admin mode.
- Alleen `owner` mag kritieke beheeracties uitvoeren zoals config/cutover/destructieve cleanup.
- De backend valideert claims server-side; de iOS app gebruikt claims alleen voor UI-gating.

### Gevolg

De lokale backend admin account store wordt op termijn uitgefaseerd voor normale operator-login.

## 3.2 Data-opslag

### Aanbevolen knip

#### Bronze

Niet naar Supabase als primaire runtime-tabellen.

Bewaren als:
- filesystem blobs, of
- Supabase Storage objecten

Gebruik:
- audit
- replay
- troubleshooting
- raw provenance

Reden:
- bronze is append-only, groot en slecht passend bij runtime query-UX
- relationele tabellen voor raw dumps maken het productmodel rommelig

#### Silver

Alleen gedeeltelijk en alleen als er een concrete operationele reden is.

Wel bewaren als:
- genormaliseerde import-run metadata
- quality events
- reconcile diagnostics
- transform versions

Niet bewaren als volledige eindgebruikers-readlaag.

Reden:
- silver is een tussenlaag voor normalisatie en debug
- eindgebruikers- en admin-UI moeten niet afhankelijk worden van intern transformatiedebris

#### Gold

Wel naar Supabase Postgres.

Gold wordt de primaire serving layer voor:
- iOS app
- admin mode
- rapportage/diagnostiek op productniveau

## 4. Aanbevolen Supabase domeinmodel

## 4.1 Kernentiteiten

### Identity / user-facing

- `profiles`
  - `id` = auth user id
  - `email`
  - `display_name`
  - `role`
  - `created_at`
  - `updated_at`

- `households`
- `household_members`
- `user_preferences`
- `weight_logs`
- `recipe_favorites`
- `day_menu_favorites`

### Product / serving (gold)

- `gold_weeks`
  - week-identiteit en bronversies

- `gold_week_plans`
  - per week/kcal/basePersons of per household-profile variant

- `gold_days`
  - dagrecords binnen een week

- `gold_day_meals`
  - ontbijt/lunch/diner/tussendoor koppelingen

- `gold_recipes`
  - canonieke receptmetadata

- `gold_recipe_sections`
  - `ingredients`, `preparation`, `tips`

- `gold_recipe_nutrition`
  - eiwit/koolhydraten/vet/vezels per recept

- `gold_recipe_day_links`
  - koppeling tussen recept en dagmenu('s)

- `gold_ingredients`
  - genormaliseerde ingredientregels per recept/plan

- `gold_shopping_lists`
- `gold_shopping_items`

### Import / operations

- `import_runs`
- `import_run_steps`
- `import_errors`
- `source_snapshots`
- `admin_config`
- `admin_audit_events`

## 4.2 Wat niet in gold hoort

Niet in gold stoppen:
- ruwe PG payloads als JSON-dumps zonder doel
- experimentele intermediate normalize-artefacts
- tijdelijke scrape responses
- parser-residuen die alleen voor debugging nuttig zijn

Die horen in bronze/silver of object storage.

## 5. Backend-rol in de doelarchitectuur

De backend blijft nodig. Supabase vervangt niet automatisch de orkestratielaag.

### Backend blijft verantwoordelijk voor

- import jobs starten en bewaken
- ProjectGezond login/session handling
- scrape/discovery/orchestratie
- bronze -> silver -> gold transformaties
- privileged server-side writes
- admin-policy enforcement
- data quality checks
- retry logic / backfills / delta-sync

### Backend wordt kleiner in runtime serving

De backend hoeft minder lokale state te beheren voor eindgebruikersreads, omdat gold in Supabase staat.

Twee verdedigbare varianten:

#### Variant A: iOS leest via backend API

Voordelen:
- centrale business rules
- eenvoudiger versioning
- minder RLS-complexiteit in eerste fase

Nadelen:
- extra hop
- backend blijft meer serving-logica houden

#### Variant B: iOS leest selectief rechtstreeks uit Supabase

Voordelen:
- minder backend surface
- sneller itereren op appdata

Nadelen:
- RLS en querycontract moeten scherp zijn
- admin mode krijgt sneller teveel directe DB-kennis

### Aanbevolen keuze

Begin met `Variant A`:
- backend blijft lees/schrijflaag voor app en admin mode
- opslag wordt wel Supabase
- directe Supabase reads pas later waar het aantoonbaar simpeler is

## 6. iOS admin mode

## 6.1 Doel

De aparte admin-webapp wordt functioneel vervangen door een admin mode in de iOS app.

## 6.2 Toegang

Admin mode is alleen zichtbaar wanneer:
- gebruiker is ingelogd via Supabase
- JWT claim / profielrol is `operator` of `owner`

## 6.3 Vindbaarheid

Plaatsing:
- tab `Instellingen`
- aparte entry `Admin mode`
- opent in sheet/modal of aparte navigation stack

Niet doen:
- admin tabs standaard in de hoofdtabbar tonen
- admin controls mengen met consumentenflow

## 6.4 Structuur van admin mode

Aanbevolen secties:

1. `Import`
- PG login status
- discover beschikbare weken
- start volledige import
- start delta-sync
- import status / foutoverzicht

2. `Data`
- aantallen recepten/weekplannen/shopping items
- laatste refresh
- dataset health

3. `Configuratie`
- niet-gevoelige runtime settings
- bron-endpoints
- feature flags

4. `Operations`
- reprocess
- cleanup dry-run
- herstelacties

5. `Diagnostics`
- ingest errors
- transform warnings
- job history

## 6.5 UX-regels

- admin mode is duidelijk gescheiden van gewone gebruikersschermen
- destructieve acties altijd met confirmatie
- lange jobs altijd asynchroon met statuspolling
- owner-only acties expliciet markeren
- runtime read-modellen moeten compact en mobiel scanbaar zijn

## 7. Rolverwerking in Supabase

## 7.1 Aanbevolen bron

Gebruik `auth.users.raw_app_meta_data.role` als bron voor admin-rol.

Voorbeelden:
- `{"role": "user"}`
- `{"role": "operator"}`
- `{"role": "owner"}`

## 7.2 Claimconventie

De backend accepteert uiteindelijk:
- `app_metadata.role`
- optioneel uitgegeven custom claim `menufit:role`

De app hoeft niet zelf te beslissen of iemand echt admin mag zijn. De app gebruikt dit alleen voor zichtbaarheid; de backend blijft finale autoriteit.

## 8. Migratiepad

## Fase 1: Auth en roles hard maken

Doel:
- alle admin gating op Supabase claims laten rusten
- lokale admin username/password flows uitfaseren

Werk:
- rolbeheer via Supabase metadata
- backend claim-validatie vereenvoudigen
- iOS sessiemodel uitbreiden met admin role awareness

## Fase 2: Gold schema in Supabase introduceren

Doel:
- huidige lokale gold state parallel schrijven naar Supabase

Werk:
- relationeel gold schema
- write-through of dual-write migratiepad
- read parity tests tussen lokale state en Supabase gold

## Fase 3: iOS admin mode bouwen

Doel:
- bestaande admin kernfunctionaliteit naar iOS brengen

Werk:
- admin entry in settings
- import/data/config/ops screens
- claim-based visibility

## Fase 4: admin web uitfaseren

Doel:
- webapp alleen nog fallback of intern hulpmiddel laten zijn

Werk:
- feature parity check
- daarna webapp read-only of verwijderen

## Fase 5: bronze/silver opslag rationaliseren

Doel:
- bepalen welke operationele artefacten in object storage, welke in Postgres blijven

Werk:
- retention policy
- replay/debug eisen
- kosten/onderhoud evaluatie

## 9. Belangrijkste trade-offs

## 9.1 Waarom niet alles direct in Supabase

Als je bronze/silver/gold zonder onderscheid naar Supabase gooit, krijg je:
- vervuilde querylaag
- onduidelijke data ownership
- meer RLS- en migratiecomplexiteit
- moeilijkere product-UX

## 9.2 Waarom de admin-webapp niet direct verwijderen

De webapp is nu nog een bruikbare fallback en referentie. Eerst parity, dan pas uitfaseren.

## 9.3 Waarom admin mode niet in de hoofdflow mag lekken

Admin en consumer hebben andere risico's, frequenties en fouttolerantie. Eén app is prima; één gemengde UX is dat niet.

## 10. Aanbevolen vervolgrichting

De eerstvolgende implementatiestappen horen te zijn:

1. Supabase rolmodel en backend-authorisatie opschonen.
2. Gold schema in Supabase ontwerpen en dual-write pad bouwen.
3. iOS admin mode met minimale kernfunctionaliteit bouwen.
4. Daarna pas admin-web deprecatie beoordelen.

## 11. Concrete beslissing

MenuFit gaat niet naar een volledige "Supabase voor alles" architectuur.

MenuFit gaat naar:
- `Supabase Auth` voor identity en roles
- `Supabase Postgres` voor gold + user/product serving data
- `Backend orchestration` voor import, transformatie en privileged ops
- `iOS admin mode` als primair beheeroppervlak
- `bronze/silver` als operationele lagen buiten de primaire eindgebruikers-readlaag
