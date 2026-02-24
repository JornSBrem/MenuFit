# PG -> Picnic App V3 Blueprint (Medallion Data Architecture)

## 1. Doel en context

Dit document beschrijft de nieuwe app alsof we vanaf nul starten: **V3**.

### 1.1 Doel van de applicatie

De applicatie heeft als doel om het wekelijkse boodschappenproces voor een huishouden betrouwbaar te automatiseren:
- weekmenu-data uit Project Gezond eenmalig ophalen;
- benodigde hoeveelheden per persoon/huishouden correct berekenen;
- producten slim matchen met het Picnic-assortiment;
- en de boodschappen gecontroleerd naar de Picnic-winkelwagen sturen.

Praktisch resultaat voor de gebruiker:
- minder handmatig zoek- en rekenwerk;
- minder fouten in hoeveelheden en productkeuze;
- sneller van weekplanning naar daadwerkelijk bestellen.

Zakelijk/doelmatig resultaat van het systeem:
- één consistente databron en reproduceerbare berekeningen;
- transparante besluitvorming (waarom een match is gekozen);
- gecontroleerde inzet van LLM alleen waar het echt waarde toevoegt.

Kernidee:
- we bouwen een kleine medallion data-architectuur (`bronze -> silver -> gold`);
- de app draait op de opgeschoonde lagen;
- externe API-calls (PG/Picnic/LLM) zijn gecontroleerd, traceerbaar en minimaal.

Primair productdoel:
- voor een gekozen week + huishouden automatisch de juiste boodschappen bepalen;
- die boodschappen betrouwbaar matchen op Picnic;
- winkelwagen vullen met hoge dekking en lage handmatige last.

## 2. Lessons learned uit huidige project (die we expliciet meenemen)

1. Grote “god files” veroorzaken regressies.
- `server.ts`/`frontend.ts` groeiden te groot.
- V3 krijgt strikte modulegrenzen (domain/usecase/integrations/web/ui).

2. Dubbele canonicalisatie/matchinglogica leidt tot drift.
- Zelfde ingrediënt kreeg ander resultaat per pad.
- V3 heeft één canonical pipeline en één matching core.

3. Raw-first werkt goed, maar moet formeel model krijgen.
- Eenmalig ophalen + lokaal herrekenen is de juiste richting.
- V3 borgt dit als architectuurregel.

4. Parserproblemen blijven terugkomen zonder versioning.
- PDF parser fixes waren nuttig maar reactief.
- V3 versieert parser en forceert gecontroleerde herberekening.

5. `basePersons` impliciet laten is foutgevoelig.
- V3 maakt `basePersons` expliciet in alle datasets en keys.

6. LLM-integratie faalt snel op providerdetails.
- Azure/OpenAI verschillen (URL, `api-version`, `max_tokens` vs `max_completion_tokens`, schema support) veroorzaakten runtime failures.
- V3 krijgt provider-adapter met capability-detectie + harde validatie vooraf.

7. Runtime config via UI is waardevol, maar restart-gedrag moet helder.
- V3 toont per instelling: “hot reload” of “restart required”.

8. UX moet mobile-first zijn.
- Weekselector en dense layouts waren op mobiel problematisch.
- V3 bouwt flows voor iPhone-first, desktop second.

9. Human-in-the-loop review is essentieel.
- LLM alleen als finish-pass werkt beter dan als primaire matcher.
- V3 houdt review queue + feedback-loop als eerste klas feature.

10. Opschonen/cleanup moet veilig en zichtbaar.
- Volledige cleanup is nodig, maar met dry-run, confirm en job-locking.

## 3. Productvisie V3

V3 bestaat uit 2 duidelijke gebruiksmodi:

1. Dagelijks gebruik (primair)
- kies week/profiel;
- controleer boodschappen;
- match + sync naar Picnic.

2. Data beheer (secundair)
- eenmalige ingest of refresh;
- kwaliteitschecks;
- herberekening en onderhoud.

Ontwerpprincipe:
- primair pad blijft klein en snel;
- alle debug/admin taken staan in “Advanced”.

### 3.1 Twee frontends / twee modi

V3 krijgt functioneel twee gescheiden frontends (mag als 2 apps of als 2 duidelijke app-modi onder één shell):

1. `Gebruikersfrontend` (dagelijks gebruik)
- implementatievoorkeur: **native iOS app in Swift/SwiftUI**;
- focus: weekplanning met maaltijden per dag, boodschappen, match en sync naar Picnic;
- gebruiker logt in met **eigen Picnic-credentials**;
- geen technische ingest/config schermen in deze flow.

2. `Beheerfrontend` (config + data management)
- focus: Project Gezond login, data extract/ingest/refresh/recompute, provider settings, diagnostics, cleanup;
- beheerder logt in met **Project Gezond account** voor extractiestappen;
- bevat geavanceerde systeeminstellingen en operationele tooling.

Scheidingseisen:
- losse navigatie, losse permissies en aparte sessiecontext;
- gebruikersfrontend mag nooit admin-acties kunnen starten;
- beheerfrontend mag niet nodig zijn voor normale week->match->bestel flow.
- backend API moet online bereikbaar zijn (internet) voor de iOS app en App Store distributie.

## 4. Niet-doelen (scope bewaken)

- Geen realtime bidirectionele sync met PG/Picnic.
- Geen complex multi-tenant platform in V3.
- Geen “LLM beslist alles” model.
- Geen harde vendor lock-in; lokale development/degradatie moet mogelijk blijven.

## 5. Architectuur-overzicht

## 5.1 Logische lagen

1. `bronze` (raw/immutable)
- exacte snapshots van externe bronnen;
- append-only met manifest en checksums.

2. `silver` (clean/normalized)
- gestandaardiseerde entiteiten en eenheden;
- canonicalisatie, dedupe, validaties, reconciliatie.

3. `gold` (serving/app-ready)
- views/aggregaties voor UI/API;
- weekoverzicht, boodschappen, matching-status, cart-plan.

4. `application/usecases`
- orkestreert jobs tussen lagen;
- bevat business workflow, geen transport details.

5. `interfaces`
- HTTP API;
- web/mobile UI;
- CLI jobs.

## 5.2 Runtime componenten

1. `api-server`
- levert online beschikbare V3 API (HTTPS, publiek bereikbaar) voor mobiele app + beheerfrontend.

2. `job-runner`
- ingest, recompute, refresh, backfills.

3. `storage`
- filesystem voor bronze blobs;
- PostgreSQL (prod) / SQLite (dev) voor silver/gold metadata en querybaarheid.

4. `adapters`
- PG adapter;
- Picnic adapter;
- LLM adapter (OpenAI/Azure compatible).

5. `identity & tenancy`
- account-authenticatie;
- huishouden/familie model;
- rolmodel (gezinshoofd + uitgenodigde leden).

## 6. Dataarchitectuur (kleine medallion)

## 6.1 Fysieke storage

1. Bronze op filesystem (immutable blobs):
- eenvoudig, goedkoop, inspecteerbaar;
- gemakkelijk te backuppen.

2. Silver/Gold in relationele database:
- `PostgreSQL` in online productie (multi-user);
- `SQLite` in lokale development/self-host varianten;
- transactioneel, versieerbaar, makkelijk migreren.

3. Index/manifest in dezelfde relationele database (PostgreSQL/SQLite):
- snelle status-queries, integriteitscontroles.

## 6.2 Bronze design

Bronze regels:
- objecten zijn immutable;
- elk object heeft `source`, `entityType`, `year`, `week`, `kcal`, `basePersons`, `fetchedAt`, `sha256`, `schemaVersion`, `requestMeta`;
- geen “cleaning” in bronze.

Voorbeeld objecttypes:
- `pg.week_menu`
- `pg.day_menu`
- `pg.recipe`
- `pg.shopping_list_pdf`
- `picnic.search_result`
- `picnic.product_detail`

Bestandslayout:
- `out/v3/bronze/<source>/<entityType>/y=<year>/w=<week>/k=<kcal>/p=<basePersons>/<sha>.json`
- binary (pdf/image) via `.bin` + metadata sidecar `.json`.

## 6.3 Silver design

Silver regels:
- deterministische transformaties vanuit bronze;
- elke transform stap heeft eigen `transformVersion`;
- alle warnings/errors worden als records opgeslagen.

Belangrijke tabellen:
- `silver_ingest_runs`
- `silver_weeks`
- `silver_meals`
- `silver_recipe_variants`
- `silver_ingredients_raw`
- `silver_ingredients_canonical`
- `silver_quantities_normalized`
- `silver_pdf_lines`
- `silver_reconcile_results`
- `silver_data_quality_events`

Kernvelden die altijd verplicht zijn:
- `year`
- `week`
- `kcal`
- `basePersons`
- `source_object_id` (trace terug naar bronze)

## 6.4 Gold design

Gold regels:
- alleen app-consumptie;
- volledig herbouwbaar uit silver;
- geen externe API-calls nodig voor read-routes.

Belangrijke tabellen/views:
- `gold_week_plan`
- `gold_grocery_totals`
- `gold_grocery_reconcile`
- `gold_match_candidates`
- `gold_match_results`
- `gold_review_queue`
- `gold_cart_plan`
- `gold_sync_reports`

## 6.5 Data lineage en reproducibility

Elke gold record bevat:
- `bronze_version_set_id`
- `silver_transform_version`
- `matching_version`
- `llm_policy_version`
- `generated_at`

Hiermee kun je exact reproduceren waarom een uitkomst zo was.

## 7. Domeinregels (business logica)

## 7.1 Hoeveelheden

1. Basisrekenregel:
- alle bronhoeveelheden normaliseren naar basiseenheden;
- schalen vanuit expliciete `basePersons`.

2. Unit families:
- massa (`g`, `kg`);
- volume (`ml`, `l`);
- stuks (`stuk`, `teen`, `plak`) alleen samenvoegen binnen family met veilige mapping.

3. Niet-sommeerbare units:
- `el`, `tl`, vrije tekstunits niet blind sommeren;
- markeren als `requires_review`.

4. Pack suggesties:
- deterministic pack rounding bovenop normalized qty.

## 7.2 Canonicalisatie

1. Één canonical pipeline:
- normalize text;
- tokenize;
- synonym map;
- stopwoorden;
- speciale heuristiek voor samengestelde NL ingredientnamen.

2. Pipeline assets:
- `canonical_ruleset_version`
- `synonym_dict_version`

## 7.3 PDF reconcile

1. Vergelijk `silver_pdf_lines` met `silver_quantities_normalized`.
2. Markeer:
- `matched`
- `partial`
- `missing_in_pdf`
- `missing_in_computed`
3. Sla warnings op in `silver_data_quality_events`.

## 8. Matching architectuur (PG -> Picnic)

## 8.1 Matching policy

1. Retrieval:
- deterministic + lexical + embeddings (optioneel) levert top-k.

2. Rerank:
- rule-based score eerst.

3. LLM finish:
- alleen op medium confidence / unresolved;
- model mag alleen kiezen uit candidate IDs;
- structured output verplicht.

4. Decision gates:
- `high`: auto map;
- `medium`: LLM finish;
- `low`: review queue.

## 8.2 Feedback-loop

1. Review acties:
- `map`
- `skip`
- `defer`

2. Feedback schrijft naar:
- mapping overrides;
- eval dataset;
- audit trail.

## 8.3 LLM provider adapter (hard requirement)

Adapter ondersteunt:
- OpenAI direct;
- Azure Foundry/OpenAI endpoint.

Preflight-validatie:
- endpoint patroon;
- deployment/model mapping;
- api-version check;
- feature flags (`json_schema`, token parameter type).

Compatibility logic:
- model dat geen `max_tokens` accepteert krijgt `max_completion_tokens`;
- bij ontbrekende `json_schema` support fallback naar strict JSON parse zonder schema mode;
- foutmeldingen worden vertaald naar duidelijke operator hints.

## 9. API ontwerp V3

Prefix:
- `/api/v3/...`

Domeinen:
1. `/api/v3/system`
- health, versions, diagnostics summary.

2. `/api/v3/config`
- read/update settings;
- per key metadata: `hotReload`, `sensitive`, `restartRequired`.

3. `/api/v3/ingest`
- plan/start/status/cancel;
- refresh en recompute varianten.

4. `/api/v3/data`
- bronze/silver/gold status;
- dataset completeness matrix.

5. `/api/v3/week`
- week ensure;
- week summary;
- groceries (computed/pdf/reconciled).

6. `/api/v3/match`
- run;
- llm-finish;
- mapping CRUD;
- review queue/decision/report.

7. `/api/v3/cart`
- plan;
- sync;
- last report.
- optionele dry-run alleen voor beheer/debug.

8. `/api/v3/admin`
- cleanup dry-run + execute;
- export debug bundle.

API principes:
- idempotent waar mogelijk;
- uniforme job envelopes;
- consistente error shape met `code`, `message`, `hint`.
- externe broncontracten (PG endpoints) worden vastgelegd in apart contractdocument: `PG_ENDPOINT_CONTRACT.md`.

## 10. UI/UX blueprint (mobile-first)

### 10.1 Frontend A: Gebruiker (Week -> Match -> Bestellen)

Technische vorm:
- native iOS app in `Swift/SwiftUI`, voorbereid voor publicatie in de App Store.

Primaire tabs:
1. `Week`
- week kiezen;
- boodschappenlijst;
- reconcile waarschuwingen compact tonen.

2. `Match`
- coverage score;
- unresolved items;
- knop “LLM finish”;
- quick review actions.

3. `Bestellen`
- cart plan;
- direct sync naar Picnic;
- sync resultaat + foutdetails.

Authenticatie:
- verplicht inloggen met eigen Picnic-account voor match/sync;
- sessie is gebruikersgebonden en bevat alleen benodigde Picnic-context.
- de app gebruikt de online backend API met veilige token-authenticatie.
- weekmenu en boodschappen data worden lokaal gecached in de app voor offline gebruik.

### 10.2 Frontend B: Beheer (Data -> Config -> Operations)

Primaire tabs:
1. `Data`
- ingest status;
- bronze/silver/gold health;
- refresh/recompute jobs.

2. `Instellingen`
- provider config;
- env editor;
- cleanup.

3. `Extract`
- inloggen met Project Gezond account;
- eenmalige full ingest starten;
- handmatige refresh/recompute uitvoeren;
- datakwaliteit en parser issues monitoren.

Authenticatie:
- beheerlogin vereist voor alle extract/config/cleanup routes;
- admin-sessie en gebruikerssessie zijn strikt gescheiden.
- rolmodel:
- `Gezinshoofd` kan gebruikers uitnodigen en huishouden beheren.
- `Gezinslid` kan week/match/bestellen gebruiken binnen gekoppeld huishouden.

UX regels:
- maximaal 1 primaire CTA per scherm;
- duidelijke status badges;
- JSON alleen in “Advanced details” accordion;
- touch targets >= 44px;
- offline/local context altijd zichtbaar.

## 11. Infra en deployment (Proxmox lokaal)

Belangrijk:
- voor de iOS app is een **online backend** vereist (publiek domein + TLS), Proxmox-only LAN deployment is dan niet voldoende voor eindgebruik.

1. Deploymentprofielen
- `Local/Dev`: Proxmox of lokale Docker Compose.
- `Online/Prod`: internet-bereikbare backend (bijv. cloud VM/container platform) met vast domein en TLS.

2. Docker compose services:
- `app-v3`
- optioneel `backup-sidecar`.

3. Volumes:
- `./out/v3`
- `./config/.env`
- `./db/v3.sqlite`

4. Reverse proxy:
- Caddy/Nginx lokaal TLS;
- basic auth optioneel op admin routes.
- in productie: publiek TLS-certificaat, HSTS en rate limiting op auth-routes.

5. Backup strategie:
- dagelijkse database dump (PostgreSQL in prod, SQLite in dev/self-host);
- bronze map incremental backup;
- mapping/review artifacts extra snapshot.

6. Restore test:
- maandelijks automatische restore-validatie.

7. Online backend eis
- productiebackend is publiek bereikbaar (HTTPS + domein) voor App Store iOS app;
- Proxmox kan dev/self-host omgeving blijven, maar eindgebruik vraagt internettoegang.

## 12. Techniekkeuzes (concreet)

Deze stack is de voorgestelde **default** voor V3.

1. Programmeertaal en runtime
- `TypeScript` (strict mode) voor backend, jobs en beheerfrontend.
- `Node.js 22 LTS` als runtime.
- `ESM` modules als standaard.

2. Backend/API
- `Fastify` als HTTP framework (performance + schema-driven routes).
- `Zod` voor input/output validatie en runtime guards.
- `OpenAPI` generatie vanuit route-schema’s voor contractvastheid.
- `Supabase Auth` (aanbevolen) voor account-login, sessies en uitnodigingen.

3. Frontend
- `Gebruikersapp`: `Swift/SwiftUI` (iOS, App Store distributie).
- `Beheerfrontend`: `React + Vite + TypeScript` (web admin).
- `TanStack Query` voor server state.
- `Zustand` (of equivalent) voor lichte UI state.
- optioneel: `PWA` capability voor admin/web fallback op mobiel.
- Frontend split:
- optie A: native iOS app + aparte web admin (`/admin`);
- optie B: native iOS app + web admin als losse deployable.

4. Data opslag (medallion)
- `Bronze`: immutable object storage (`JSON` + binaire blobs met metadata sidecar).
- `Silver/Gold`: `PostgreSQL` in productie (online multi-user), `SQLite` in lokale dev.
- `Supabase Postgres` is aanbevolen default voor online productie.
- Partitionering via jaar/week/kcal/basePersons in keys en indexen.

5. Database tooling
- `Drizzle ORM` + `drizzle-kit` voor typed schema en migraties.
- SQL views/materialized tabellen voor gold-serving lagen.
- Dataset/version tabellen voor lineage (`transformVersion`, `matchingVersion`, `llmPolicyVersion`).

6. Job orchestration
- Interne job-runner op basis van database job tabellen + file lock.
- Geen externe queue als default (dus geen Redis dependency nodig).
- Idempotente jobs met status `planned/running/done/error/canceled`.

7. Matching en AI
- Shared deterministic matching core in TypeScript.
- Retrieval + reranker pipeline met feature flags.
- LLM adapter met providerprofielen:
- `OpenAI`
- `Azure OpenAI / Foundry`
- Capability-checks vooraf (API-version/schema/tokens parameters).

8. Configuratie en secrets
- `.env` + runtime config laag met validatie.
- Gevoelige waarden gemarkeerd als `sensitive`.
- Per setting metadata:
- `hotReload`
- `restartRequired`

9. Testing
- `Vitest` voor unit en integratie.
- `Playwright` voor mobile viewport smoke tests.
- Golden dataset tests voor regressie op week-output en matching.
- Contract tests voor provider adapters (PG/Picnic/LLM).

10. Logging en observability
- `pino` structured logs met correlatie-id.
- Operationele metrics endpoint (`/metrics`) in Prometheus formaat.
- Audit events in database voor config/mapping/review/sync acties.

11. Deploy op Proxmox
- `Docker Compose` met multi-stage `Dockerfile`.
- Volumes:
- `out/v3/bronze`
- `db/v3.sqlite`
- `config/.env`
- Reverse proxy via `Caddy` of `Nginx`.
- Backup via dagelijkse SQLite dump + incrementele bronze backup.

12. Online productieprofiel
- Backend API in internet-bereikbare omgeving (VM/container platform).
- Managed database (Supabase Postgres aanbevolen).
- Object storage voor bronze snapshots.
- TLS, rate limiting, monitoring en back-up beleid verplicht.

13. Waarom deze stack
- Sluit aan op huidige codebasis (TypeScript/Node), dus lage migratierisico’s.
- Ondersteunt zowel lokaal self-hosten als online multi-user productie.
- Genoeg structuur voor betrouwbaarheid, zonder over-engineering.

## 13. Security en privacy

1. Secrets alleen in env/config store.
2. Bronze bewaart originele payloads inclusief headers (raw fidelity), maar opslag is versleuteld en afgeschermd; logs blijven wel redacted.
3. Logs standaard redacted.
4. Audit log voor:
- config changes;
- mapping overrides;
- manual review decisions;
- cart sync acties.

## 14. Observability en operations

1. Structured logging met correlation IDs.
2. Job metrics:
- throughput;
- retries;
- fail ratio;
- queue lag.

3. Data quality dashboard:
- missing recipes;
- unit conflicts;
- pdf reconcile mismatches;
- no-match clusters.

4. Alert thresholds (lokaal):
- ingest fail > X%;
- match coverage < threshold;
- llm error rate > threshold.

## 15. Teststrategie

1. Unit tests:
- canonicalisatie;
- unit conversion;
- score policy;
- gating logic.

2. Contract tests:
- PG adapter responses;
- Picnic adapter responses;
- LLM adapter provider differences.

3. Golden dataset tests:
- vaste weken met bekende output;
- week 9 regressiecases inbegrepen.

4. End-to-end tests:
- ingest -> silver -> gold -> match -> cart sync.

5. Non-functional:
- mobile viewport smoke tests;
- performance op volledige jaarset.

## 16. Migratie van huidige app naar V3

Fase A:
- V3 read-only bouwen op bestaande raw exports.

Fase B:
- parallel draaien met V1/V2;
- parity rapport op weekoutput/match coverage.

Fase C:
- V3 als default UI voor dagelijks gebruik;
- V1 blijft als fallback naast V3 bestaan.

Fase D:
- deprecatie oude routes na stabiele periode.

## 17. Roadmap met concrete increments

1. `Milestone 0 - Foundations`
- project scaffold;
- storage schema;
- config subsystem.

2. `Milestone 1 - Bronze pipeline`
- ingest planner + runner;
- manifest + integrity checks;
- retry/backoff.

3. `Milestone 2 - Silver transforms`
- normalize/canonical/reconcile;
- quality events + reprocess tooling.

4. `Milestone 3 - Gold serving`
- week/grocery views;
- stable API contract.

5. `Milestone 4 - Matching`
- shared core;
- retrieval;
- llm finish adapter;
- review queue.

6. `Milestone 5 - Cart sync + UX hardening`
- idempotent sync;
- mobile-first polishing;
- diagnostics.

7. `Milestone 6 - Production readiness`
- backups;
- observability;
- cutover checklist.

## 18. Definition of Done (V3 GA)

1. Eén ingest-run bouwt complete bronze dataset voor doeljaar.
2. Silver en gold volledig herbouwbaar zonder externe calls.
3. Match coverage en no-match-rate minimaal gelijk of beter dan huidige baseline.
4. LLM failures blokkeren flow niet; fallback werkt aantoonbaar.
5. Mobiele primary flow (Week -> Match -> Bestellen) werkt stabiel op iPhone.
6. Cleanup, backup, restore en diagnostics zijn aantoonbaar werkend.

## 19. Besluiten op productvragen

1. Gebruikersmodel
- V3 ondersteunt multi-user accounts vanaf start.
- Aanbevolen implementatie: `Supabase Auth` voor login/sessiebeheer.

2. Huishouden/gezinsmodel
- Eén account kan `Gezinshoofd` zijn.
- Gezinshoofd kan andere gebruikers uitnodigen en koppelen aan hetzelfde huishouden.

3. Kcal-profielen
- Bronset blijft gebaseerd op `1250/1500/1800/2100`.
- V3 ondersteunt dynamische kcal-profielen via afgeleide berekening/scaling bovenop deze basisset.

4. Porties/basePersons
- `basePersons=2` wordt niet als harde aanname gebruikt.
- V3 ondersteunt variabele yield-vormen (personen, porties, stuks zoals cakejes).

5. PG endpoint contract
- V3 gebruikt dezelfde PG endpoints als huidige app.
- Contract wordt expliciet vastgelegd in `PG_ENDPOINT_CONTRACT.md`.

6. Bronze opslag fidelity
- Bronze bewaart originele data inclusief headers (zonder transformatie).

7. Offline gedrag
- Weekmenu en boodschappenlijst moeten offline beschikbaar zijn in de user app (cache).
- Picnic sync vereist internetverbinding.

8. Sync gedrag
- User app doet directe push naar Picnic (geen verplichte dry-run in primaire flow).
- Dry-run blijft alleen optioneel beschikbaar in beheer/debug.

9. KPI drempels (initieel advies)
- Top-1 >= 0.70
- Top-3 >= 0.88
- Review-rate <= 0.25
- No-match-rate <= 0.10
- Deze thresholds zijn release-gates en worden na 2-4 weken productie-data herijkt.

10. Taalstrategie
- V3 start NL-only.
- i18n-voorbereiding is verplicht (resource-based strings, locale-aware formatting).

11. Rollback eis
- Geen harde eis voor single-click dataset rollback in V3.

12. V1 lifecycle
- V1 blijft voorlopig bestaan als fallback naast V3.
