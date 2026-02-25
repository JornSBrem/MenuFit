# MenuFit Workitems

## Backlog

- [ ] WI-230 | type:chore | priority:P2 | status:TODO | title:Managed cloud observability provisioning als IaC
  - context: WI-222 levert compose-based externe observability stack; managed cloud provisioning (vendor-specifieke IaC) bleef out-of-scope.
  - acceptance:
    - Prometheus/Grafana/alerting equivalenten zijn als reproduceerbare IaC modules beschikbaar voor productie.
    - Provisioning ondersteunt environment-specifieke configuratie en gecontroleerde rollout/rollback.

- [ ] WI-231 | type:spike | priority:P3 | status:TODO | title:Langetermijnretentie en multi-cluster observability federatieontwerp
  - context: WI-222 sluit retention tuning en multi-cluster federatie expliciet uit.
  - acceptance:
    - Ontwerp beschrijft retentiebeleid (kosten/prestatie/SLA) met operationele trade-offs.
    - Federatiestrategie voor meerdere clusters/omgevingen bevat query-, alerting- en failover-impact.

- [ ] WI-232 | type:chore | priority:P2 | status:TODO | title:Volledige Front Door/CDN topology + certificaat provisioning
  - context: WI-223 levert WAF/CDN policy-as-code maar sluit volledige Front Door topology en certificaatprovisioning uit.
  - acceptance:
    - Front Door endpoints, origin groups, routes en TLS-certificaten zijn als IaC geautomatiseerd.
    - Uitrol ondersteunt gecontroleerde migratie zonder downtime op productie-ingress.

- [ ] WI-233 | type:chore | priority:P3 | status:TODO | title:Geo/IP allowlist policy tuning per omgeving en tenant
  - context: WI-223 sluit geo/IP allowlists tuning expliciet uit.
  - acceptance:
    - Edge policy ondersteunt omgeving/tenant-specifieke allowlist- en blocklist-rules.
    - Operationele procedure dekt onboarding en review van allowlist wijzigingen.

- [ ] WI-234 | type:feature | priority:P2 | status:TODO | title:Cloud provisioning uitbreiding met database engine migratiepad
  - context: WI-224 levert productie infra baseline maar sluit database engine migratie en rollout expliciet uit.
  - acceptance:
    - Provisioningpad ondersteunt database-engine resources met gecontroleerde migratie- en cutoverstappen.
    - Runbook dekt rollback-safe herstel bij mislukte migratie.

- [ ] WI-235 | type:chore | priority:P2 | status:TODO | title:Blue/green traffic shifting automatisering voor zero-downtime releases
  - context: WI-224 sluit blue/green traffic shifting en zero-downtime orchestration expliciet uit.
  - acceptance:
    - Deployflow ondersteunt gecontroleerde traffic shift tussen oude en nieuwe revisie.
    - Geautomatiseerde rollback triggert bij health-check regressies.

- [ ] WI-236 | type:feature | priority:P2 | status:TODO | title:Geautomatiseerde sqlite-naar-postgres migratietooling voor live cutover
  - context: WI-225 voegt postgres runtime toe maar sluit geautomatiseerde live datamigratie expliciet uit.
  - acceptance:
    - Tooling migreert persistente state van sqlite naar postgres met validatie en checksum/recordtelling.
    - Cutoverpad bevat dry-run en hersteloptie zonder dataverlies.

- [ ] WI-237 | type:spike | priority:P3 | status:TODO | title:Sharded/multi-region postgres topologie ontwerp en rolloutpad
  - context: WI-225 sluit sharded en multi-region postgres topologie expliciet uit.
  - acceptance:
    - Ontwerp beschrijft partitionering/replicatie strategie met latency- en failover trade-offs.
    - Rolloutpad bevat risicoanalyse, observability-eisen en migratiestappen.

- [ ] WI-238 | type:feature | priority:P2 | status:TODO | title:Volledige etcd lock-backend implementatie met lease parity
  - context: WI-226 levert externe lock backend via Redis, maar volledige etcd backend parity bleef out-of-scope.
  - acceptance:
    - Etcd backend ondersteunt acquire/renew/release semantiek equivalent aan Redis pad.
    - Runtime configuratie kan Redis en etcd backends veilig wisselen met regressietests.

- [ ] WI-239 | type:spike | priority:P3 | status:TODO | title:Synthetische cluster contention/load test voor lock backends
  - context: WI-227 levert lock metrics/dashboards, maar synthetische cluster contention-loadtests bleven out-of-scope.
  - acceptance:
    - Loadscenario's simuleren multi-node lock contention met reproduceerbare meetresultaten.
    - Resultaten leveren drempelwaarden voor timeout/contention alerts.

- [ ] WI-240 | type:spike | priority:P3 | status:TODO | title:Tenant-level lock isolatie analytics ontwerp
  - context: WI-227 sluit tenant-level lock isolatie analytics expliciet uit.
  - acceptance:
    - Ontwerp beschrijft lock-metrics segmentatie per tenant/workload zonder gevoelige data leakage.
    - Benodigde telemetry-uitbreidingen en querypatronen zijn gedefinieerd.

- [ ] WI-241 | type:chore | priority:P3 | status:TODO | title:Contract replay tooling voor iOS E2E op basis van HAR-captures
  - context: WI-228 sluit contract replay tooling vanuit captured HAR sessies expliciet uit.
  - acceptance:
    - Tooling kan backend contractresponses reproduceren vanuit versiebeheerbare HAR/fixture bron.
    - iOS E2E suite kan scenario's draaien tegen replay-data zonder externe backend afhankelijkheden.

- [ ] WI-216 | type:feature | priority:P3 | status:TODO | title:Uitbreidbare ingest-matrix voor arbitraire kcal-waarden
  - context: WI-202 sluit extra ingest matrix uitbreiding voor arbitraire kcal-waarden expliciet uit.
  - acceptance:
    - Ingest planner ondersteunt configureerbare kcal-sets buiten de baselinewaarden.
    - Pipeline en opslag blijven deterministisch bij grotere profiel-matrices.

- [ ] WI-217 | type:feature | priority:P2 | status:TODO | title:Gebruikersinstellingen voor kcal-profielbeheer
  - context: WI-202 levert backend-afleiding maar geen user-facing profielbeheer of voorkeuren.
  - acceptance:
    - Gebruiker kan een persoonlijk kcal-profiel kiezen/beheren in de primaire flow.
    - Geselecteerd profiel wordt consistent toegepast op week/grocery reads.

- [ ] WI-218 | type:feature | priority:P2 | status:TODO | title:Runtime locale switching + locale persistency
  - context: WI-203 levert resource-based strings, maar nog geen actieve locale-switch of voorkeuropslag.
  - acceptance:
    - Gebruiker/operator kan locale wisselen tijdens runtime zonder app-herstart.
    - Gekozen locale wordt persistent opgeslagen en hersteld bij volgende sessie.

- [ ] WI-219 | type:chore | priority:P2 | status:TODO | title:Volledige foutlokalisatie voor backend/domain error payloads
  - context: WI-203 sluit volledige lokalisatie van backend/domain foutteksten expliciet uit.
  - acceptance:
    - User-facing foutmeldingen zijn via i18n resources gemapt op error codes/hints.
    - Onbekende fouten hebben consistente gelokaliseerde fallback-berichten.

- [ ] WI-220 | type:feature | priority:P1 | status:TODO | title:Volledige OAuth/OpenID provider-integratie voor loginflows
  - context: WI-207 levert sessie-lifecycle baseline, maar sluit volledige OAuth/OpenID provider-integratie expliciet uit.
  - acceptance:
    - Loginflow gebruikt een echte OAuth/OpenID provider met autorisatiecode- en token-uitwisseling.
    - Provider claims worden veilig vertaald naar user/admin sessies en autorisatieregels.

- [ ] WI-221 | type:chore | priority:P1 | status:TODO | title:JWT handtekeningverificatie tegen externe IdP sleutels
  - context: WI-207 sluit cryptografische JWT-verificatie tegen externe IdP keys expliciet uit.
  - acceptance:
    - JWT tokens worden server-side gevalideerd op handtekening, issuer, audience en expiry.
    - Sleutelrotatie (JWKS) wordt ondersteund zonder downtime.

- [ ] WI-248 | type:feature | priority:P1 | status:DONE | title:Admin web configuratiepanel met runtime settings, validatie en audit
  - context: Configuratie bestaat backendmatig maar mist een bruikbaar web-configuratiepanel voor operators.
  - acceptance:
    - Web-app toont configureerbare runtime-instellingen met duidelijke validatie en foutafhandeling.
    - Wijzigingen worden versieerbaar/auditbaar vastgelegd inclusief wie/wanneer/wat.

- [ ] WI-250 | type:feature | priority:P1 | status:TODO | title:iOS receptenpagina met bibliotheek, zoeken, filteren en favorieten
  - context: Voor dagelijkse waarde moet de app naast weekmenu ook een bruikbare receptenbibliotheek bieden.
  - acceptance:
    - Receptenpagina toont alle bekende recepten met bruikbare lijst/kaartweergave.
    - Gebruiker kan zoeken en filteren (bijv. type/ingrediënt/tijd) met duidelijke lege-resultaat status.
    - Gebruiker kan recepten favoriet maken/ontfavorieten en favorieten apart terugvinden.

- [ ] WI-251 | type:feature | priority:P1 | status:TODO | title:iOS receptbeheer met toevoegen en deel/privacy-instellingen
  - context: Gebruiker moet recepten kunnen toevoegen en bewust bepalen of die privé, gedeeld met gezin of gedeeld met andere gebruikers zijn.
  - acceptance:
    - Gebruiker kan nieuw recept aanmaken/bewerken vanuit de app met basisvalidatie.
    - Per recept kan zichtbaarheid ingesteld worden op `privé`, `gezin`, of `gedeeld met geselecteerde gebruikers`.
    - Delen/privacyinstellingen worden consequent afgedwongen in receptenlijst, detail en zoekresultaten.

- [ ] WI-252 | type:chore | priority:P3 | status:TODO | title:Multi-device snapshot baseline matrix voor iOS visual regression
  - context: WI-229 sluit multi-device baseline matrices expliciet uit.
  - acceptance:
    - Snapshot tooling ondersteunt baseline-sets per minimaal iPhone compact en regulier formaat.
    - CI kan per geconfigureerd device-type regressies detecteren zonder baseline-conflicten.

- [ ] WI-253 | type:spike | priority:P3 | status:TODO | title:Verkenning externe visual regression service voor iOS UI
  - context: WI-229 sluit externe visual regression services expliciet uit.
  - acceptance:
    - Vergelijking documenteert ten minste twee externe opties op integratiecomplexiteit, kosten en dataprivacy.
    - Aanbeveling bevat adoptiepad inclusief rollback naar interne snapshot tooling.

- [ ] WI-254 | type:feature | priority:P2 | status:TODO | title:Server-gedreven refresh token exchange voor iOS sessie-herstel
  - context: WI-242 levert handmatige sessieherstel UX, maar automatische/server-gedreven token refresh bleef out-of-scope.
  - acceptance:
    - iOS flow kan verlopen access tokens vernieuwen via backend refresh endpoint zonder handmatige tokeninvoer.
    - Fallbackpad bij refresh failure toont expliciete herauthenticatie actie zonder silent failure.

- [ ] WI-255 | type:feature | priority:P2 | status:TODO | title:Member-specifieke weekmenu filtering in backend read-routes
  - context: WI-243 levert frontend-gezinsswitch, maar backend levert nog geen member-specifieke weekmenu varianten per geselecteerde gebruiker.
  - acceptance:
    - Week read-routes ondersteunen member-context zodat menuresultaten per geselecteerd gezinslid kunnen verschillen.
    - iOS member-switch toont aantoonbaar member-specifieke menu-uitkomsten i.p.v. alleen UI-contextwissel.

- [ ] WI-256 | type:feature | priority:P3 | status:TODO | title:Backend-gedreven categorie/pad taxonomie voor boodschappen
  - context: WI-244 gebruikt lokale heuristische groepering; centrale backend-taxonomie voor winkelpad/categorie bleef out-of-scope.
  - acceptance:
    - Backend levert gestandaardiseerde categorie/pad metadata per boodschappenitem.
    - iOS checklist gebruikt backend-categorieën i.p.v. lokale heuristiek.

- [ ] WI-257 | type:feature | priority:P3 | status:TODO | title:Cross-device sync voor checklist voortgang
  - context: WI-244 slaat checkliststatus alleen lokaal op; synchronisatie over devices/account ontbreekt.
  - acceptance:
    - Afgevinkte status wordt server-side opgeslagen en op meerdere devices consistent hersteld.
    - Conflictafhandeling bij gelijktijdige updates is gedefinieerd en getest.

- [ ] WI-258 | type:feature | priority:P3 | status:TODO | title:Provider-specifieke line-item retry orchestration voor bestelfouten
  - context: WI-245 voegt generieke retryknop toe, maar provider-specifieke retries per foutregel bleven out-of-scope.
  - acceptance:
    - Foute syncregels kunnen gericht opnieuw aangeboden worden met provider-specifieke validatie.
    - UI toont retryresultaat per regel inclusief niet-herstelbare fouten.

- [ ] WI-259 | type:chore | priority:P3 | status:TODO | title:Achtergrond auto-retry scheduling voor tijdelijke bestelfouten
  - context: WI-245 behandelt retries handmatig; geautomatiseerde achtergrond retry scheduling bleef out-of-scope.
  - acceptance:
    - Tijdelijke bestelfouten kunnen volgens policy automatisch opnieuw geprobeerd worden.
    - Operator ziet retry-queue status en kan geplande retries annuleren/hervatten.

- [ ] WI-260 | type:feature | priority:P3 | status:TODO | title:Rendered admin UI componenten voor household/session operations
  - context: WI-246 levert controller/API-contracten, maar volledige zichtbare webcomponenten voor operators bleven out-of-scope.
  - acceptance:
    - Admin web toont huishoudstatus, uitnodigingen en sessiediagnose in concrete UI componenten.
    - Supportacties (resend/reset/diagnose) zijn via zichtbare UI interacties uitvoerbaar.

- [ ] WI-261 | type:feature | priority:P2 | status:TODO | title:Rendered admin UI componenten voor runtime settings configuratie
  - context: WI-248 levert controllervalidatie en auditstate, maar nog geen concrete webcomponenten/formulieren voor operators.
  - acceptance:
    - Settings tab toont bewerkbare runtime instellingen met inline validatie en duidelijke foutmeldingen.
    - Operators kunnen instellingen wijzigen via zichtbare UI met bevestiging van toegepaste wijziging.

- [ ] WI-262 | type:feature | priority:P2 | status:TODO | title:Persistente backend auditgeschiedenis voor runtime config wijzigingen
  - context: WI-248 bewaart auditinformatie alleen in-memory in admin-web; persistente historie/querypad ontbreekt.
  - acceptance:
    - Config wijzigingsaudit wordt server-side persistente opgeslagen met actor/timestamp/before-after context.
    - Admin web kan auditgeschiedenis ophalen en filteren zonder verlies na restart/deploy.

- [ ] WI-263 | type:feature | priority:P2 | status:TODO | title:Rendered admin UI componenten voor recepten/weekmenu/mapping beheer
  - context: WI-249 levert controller/API-contracten voor databeheer, maar nog geen zichtbare operator-UI componenten.
  - acceptance:
    - Admin web toont concrete beheercomponenten (tabellen/formulieren) voor recepten, weekmenu's en mapping overrides.
    - Operators kunnen via UI CRUD-acties uitvoeren met duidelijke validatie en statusfeedback.

- [ ] WI-264 | type:feature | priority:P2 | status:TODO | title:Backend endpointimplementatie voor admin data beheercontracten
  - context: WI-249 definieert admin-web contracts voor recepten/weekmenu/mapping beheer, maar backend routes/service-persistentie ontbreken.
  - acceptance:
    - Backend biedt beveiligde admin endpoints voor list/upsert/delete op recepten, weekmenu's en mapping overrides.
    - Writes zijn traceerbaar via operation reports en direct consumeerbaar door admin data management flow.

## Done (recent additions)

- [x] WI-220 | type:feature | priority:P1 | status:DONE | title:Volledige OAuth/OpenID provider-integratie voor loginflows
  - context: WI-207 levert sessie-lifecycle baseline, maar sluit volledige OAuth/OpenID provider-integratie expliciet uit.
  - acceptance:
    - Loginflow gebruikt een echte OAuth/OpenID provider met autorisatiecode- en token-uitwisseling.
    - Provider claims worden veilig vertaald naar user/admin sessies en autorisatieregels.

- [x] WI-221 | type:chore | priority:P1 | status:DONE | title:JWT handtekeningverificatie tegen externe IdP sleutels
  - context: WI-207 sluit cryptografische JWT-verificatie tegen externe IdP keys expliciet uit.
  - acceptance:
    - JWT tokens worden server-side gevalideerd op handtekening, issuer, audience en expiry.
    - Sleutelrotatie (JWKS) wordt ondersteund zonder downtime.

## In Progress

## Done

- [x] WI-249 | type:feature | priority:P1 | status:DONE | title:Admin web data beheerpanelen voor recepten, weekmenu's en mapping overrides
  - context: Voor een werkbare V1 hebben operators direct beheer nodig op kernproductdata i.p.v. alleen technische operatieschermen.
  - acceptance:
    - Web-app ondersteunt CRUD/workflows voor kernentiteiten (recepten, weekmenu's, mapping overrides) met veilige validatieregels.
    - Wijzigingen zijn direct zichtbaar in user flow of via expliciete publish/recompute stap met traceerbare status.

- [x] WI-248 | type:feature | priority:P1 | status:DONE | title:Admin web configuratiepanel met runtime settings, validatie en audit
  - context: Configuratie bestaat backendmatig maar mist een bruikbaar web-configuratiepanel voor operators.
  - acceptance:
    - Web-app toont configureerbare runtime-instellingen met duidelijke validatie en foutafhandeling.
    - Wijzigingen worden versieerbaar/auditbaar vastgelegd inclusief wie/wanneer/wat.

- [x] WI-247 | type:spike | priority:P1 | status:DONE | title:Database platformkeuze en migratiepad (Supabase vs huidige Postgres stack)
  - context: Voor een eerste werkbare versie is onduidelijk of we doorgaan op eigen Postgres provisioning of overstappen naar Supabase managed stack; die keuze blokkeert UI/feature keuzes in auth, opslag en admin.
  - acceptance:
    - Beslisdocument vergelijkt Supabase en huidige stack op auth, RLS/security, operations, kosten en vendor lock-in.
    - Gekozen richting heeft een concreet migratie-/adoptiepad met scope, risico's en rollbackstrategie.

- [x] WI-246 | type:feature | priority:P2 | status:DONE | title:Admin web operationele UI voor huishoudens, invites en sessiestatus
  - context: Huishouden/invite en sessiestromen bestaan backendmatig maar missen een operatorvriendelijke beheer-UI voor support en troubleshooting.
  - acceptance:
    - Admin kan huishoudens, uitnodigingen en sessiestatus inzien en gericht filteren.
    - Kritieke support-acties (opnieuw uitnodigen, status reset, sessiediagnose) zijn veilig uitvoerbaar met audit trail.

- [x] WI-245 | type:feature | priority:P2 | status:DONE | title:iOS bestelflow UX met pre-flight validatie en duidelijke bevestiging
  - context: Bestelactie is technisch beschikbaar maar mist een gebruiksvriendelijke pre-flight en heldere succes/foutbevestiging.
  - acceptance:
    - Voor sync ziet gebruiker een samenvatting/controlepunt (items, unresolved, verwachte actie).
    - Na sync krijgt gebruiker een duidelijke bevestigingsstatus met herstelactie bij gedeeltelijke failure.

- [x] WI-244 | type:feature | priority:P2 | status:DONE | title:iOS boodschappenlijst UX met afvinken, groepering en lokale voortgang
  - context: Boodschappen worden nu als vlakke lijst getoond zonder interactie; voor dagelijks gebruik is afvinkbare voortgang nodig.
  - acceptance:
    - Boodschappenlijst ondersteunt afvinken per item met persistente lokale voortgang.
    - Items worden logisch gegroepeerd (bijv. categorie/pad) en tonen duidelijke status open/klaar.

- [x] WI-243 | type:feature | priority:P1 | status:DONE | title:iOS weekmenu als primaire home-flow (vandaag + gezinsswitch + weeknavigatie)
  - context: De app moet primair draaien om weekmenu-consumptie, niet alleen bestellen; gebruiker moet direct eigen dagmenu zien en snel kunnen wisselen binnen het gezin.
  - acceptance:
    - Bij openen/login wordt altijd het weekmenu van de ingelogde gebruiker geladen met het menu van vandaag als default focus.
    - Gebruiker kan vanuit de home/menubalk wisselen naar gekoppelde gezinsleden door op naam te klikken.
    - Gebruiker kan soepel navigeren naar vorige/volgende weekmenu's zonder verlies van geselecteerde persoon.

- [x] WI-242 | type:feature | priority:P1 | status:DONE | title:iOS eerste-keer onboarding en sessie-herstel flow
  - context: Huidige iOS flow veronderstelt al geldige sessieconfiguratie; voor een eerste werkbare versie ontbreekt guided onboarding/herstel in de app zelf.
  - acceptance:
    - Nieuwe gebruiker krijgt een duidelijke onboarding/login-startflow i.p.v. technische foutstatussen.
    - Bestaande gebruiker krijgt sessie-herstel/refresh UX met expliciete actie bij verlopen sessie.

- [x] WI-229 | type:chore | priority:P3 | status:DONE | title:Visual regression snapshot tooling voor iOS UI
  - context: WI-215 sluit visual regression snapshot tooling expliciet uit.
  - acceptance:
    - Snapshot-baseline voor kernschermen kan geautomatiseerd vergeleken worden in CI.
    - Regressies op layout/styling leveren expliciete diffs en failen de quality gate.

- [x] WI-228 | type:chore | priority:P3 | status:DONE | title:Uitgebreide iOS E2E testsuite met backend mocks en netwerkvirtualisatie
  - context: WI-215 levert alleen baseline UI smoke automation; volledige mobiele E2E suite met gecontroleerde backend-/netwerksimulatie bleef out-of-scope.
  - acceptance:
    - iOS testsuite dekt kernscenario's en foutpaden met deterministische backend mocks.
    - Netwerkvirtualisatie voorkomt flaky tests door externe afhankelijkheden.

- [x] WI-227 | type:chore | priority:P3 | status:DONE | title:Cluster-wide lock observability dashboards
  - context: WI-214 voegt lockcoördinatie toe, maar cluster-brede lock metrics/dashboards bleven out-of-scope.
  - acceptance:
    - Lock acquire/timeout/stale-reclaim metrics zijn zichtbaar in operationele dashboards.
    - Alerts bestaan voor verhoogde lock contention en timeouts.

- [x] WI-226 | type:feature | priority:P2 | status:DONE | title:Externe distributed lock backend integratie (Redis/etcd)
  - context: WI-214 levert file lease locks; externe lock backend voor multi-node/cluster scenarios bleef out-of-scope.
  - acceptance:
    - Kritieke writes gebruiken configureerbare externe lock backend met lease/renew semantics.
    - Failover/pad bij lock backend storingen is gedocumenteerd en getest.

- [x] WI-225 | type:feature | priority:P2 | status:DONE | title:Postgres runtime en operationele DB setup voor persistente domeinen
  - context: WI-213 levert relationele SQLite runtime, maar volledige Postgres runtime/deployment bleef out-of-scope.
  - acceptance:
    - Persistente domeinen draaien op Postgres runtime met migraties en veilige connectieconfiguratie.
    - Operationele runbooks dekken pooling, backup en herstel voor productiegebruik.

- [x] WI-224 | type:chore | priority:P2 | status:DONE | title:Cloud deployment provisioning voor productie-omgeving
  - context: WI-212 levert delivery guardrails en checks, maar volledige cloud provisioning blijft out-of-scope.
  - acceptance:
    - Productie infrastructuur provisioning (compute/network/secrets/observability basis) is geautomatiseerd en reproduceerbaar.
    - Provisioningpad bevat rollback/rollback-safe documentatie en validatiechecks.

- [x] WI-223 | type:chore | priority:P2 | status:DONE | title:Netwerk-level WAF/CDN policy configuratie voor productie ingress
  - context: WI-211 levert applicatie-level WAF guards; edge/network WAF policies zijn nog niet ingericht.
  - acceptance:
    - Ingress heeft afdwingbare WAF/CDN rulesets voor OWASP-baseline en rate controls op kritieke endpoints.
    - Deploybare configuratie is traceerbaar versiebeheer met rollbackpad.

- [x] WI-222 | type:chore | priority:P2 | status:DONE | title:Externe observability stack provisioning (Prometheus/Grafana) voor productie
  - context: WI-211 levert interne telemetry export, maar provisioning/operationalisatie van externe observability stack bleef out-of-scope.
  - acceptance:
    - Prometheus scrape en Grafana dashboards zijn ingericht voor backend route/security/job metrics.
    - Alertregels voor fout- en blocked-rates zijn gekoppeld aan operationele escalatiekanalen.

- [x] WI-215 | type:chore | priority:P3 | status:DONE | title:iOS UI testautomatisering via Xcode simulator in CI
  - context: Teststrategie-plan sluit volledige mobile UI test automation expliciet uit.
  - acceptance:
    - Baseline iOS UI smoke-tests draaien geautomatiseerd op simulator in CI.
    - Regressies op primaire flow (Week -> Match -> Bestellen) worden in pipeline gedetecteerd.

- [x] WI-214 | type:chore | priority:P2 | status:DONE | title:Distributed locking en multi-process write coördinatie
  - context: WI-206 sluit gelijktijdige multi-process write coördinatie expliciet uit.
  - acceptance:
    - Kritieke write-paden hebben distributed locking of equivalente lease/coördinatie.
    - Gelijktijdige writes veroorzaken geen dubbele of corrupte state-overgangen.

- [x] WI-213 | type:feature | priority:P2 | status:DONE | title:Relationele database runtime-integratie voor persistente domeinen
  - context: WI-206 noemt volledige relationele database-integratie expliciet als out-of-scope.
  - acceptance:
    - Persistente opslag gebruikt een relationele runtime (bijv. Postgres/SQLite) i.p.v. alleen file/in-memory opslag.
    - Migraties en runtime toegangspaden zijn consistent voor silver/gold/jobs/idempotency/audit.

- [x] WI-212 | type:chore | priority:P3 | status:DONE | title:Delivery hardening: deploy wiring, branch protection en live contract-validatie
  - context: Deployment wiring, branch protection en live endpoint-contract validatie zijn nog niet afgerond.
  - acceptance:
    - Deployment pipeline en branch protection policies zijn ingesteld en gedocumenteerd.
    - Live contract-validatie tegen externe endpoints is opgenomen in release checks.

- [x] WI-211 | type:chore | priority:P2 | status:DONE | title:Observability en security hardening voor productie
  - context: Externe observability stacks, telemetry ingestie, RBAC/WAF/rate-limiting zijn nog openstaande out-of-scope punten.
  - acceptance:
    - Monitor/trace/metric pipelines leveren operationele dashboards en release-gate input.
    - RBAC, rate-limiting en WAF policies zijn technisch afdwingbaar op kritieke API-routes.

- [x] WI-210 | type:feature | priority:P2 | status:DONE | title:iOS productionization met Xcode project, token-auth en uitgebreide match-flow
  - context: iOS baseline liet projectgeneratie/signing en volledige auth/match integratie buiten scope.
  - acceptance:
    - Xcode project/build signing setup is aanwezig voor teamontwikkeling.
    - App gebruikt echte token-auth en ondersteunt volledige match-flow integratie.

- [x] WI-209 | type:feature | priority:P2 | status:DONE | title:Admin web React/Vite UI uitwerken voor operations dashboards
  - context: Alleen baseline modules bestaan; volwaardige operator-UI is nog niet geïmplementeerd.
  - acceptance:
    - Data/Instellingen/Extract/Operations views hebben werkende UI states (loading/empty/error/success).
    - Kritieke admin flows (ingest, recompute, cleanup, diagnostics) zijn interactief uitvoerbaar.

- [x] WI-208 | type:chore | priority:P2 | status:DONE | title:Production scheduler + background retry queues
  - context: Scheduler wiring en persisted retries zijn herhaaldelijk out-of-scope gebleven.
  - acceptance:
    - Ingest/system jobs draaien via production scheduler met status- en foutregistratie.
    - Retry-queues voor externe afhankelijkheden zijn persistent en herstart-veilig.

- [x] WI-207 | type:feature | priority:P1 | status:DONE | title:Echte auth/session lifecycle voor PG/Picnic + user/admin middleware
  - context: Out-of-scope items noemen expliciet ontbrekende auth/session lifecycle en middleware wiring.
  - acceptance:
    - PG/Picnic sessies en token lifecycle worden veilig beheerd met refresh/expiry regels.
    - User/admin route middleware valideert identiteit en sessietype consistent.

- [x] WI-204 | type:feature | priority:P3 | status:DONE | title:Geautomatiseerde cutover checklist V1 -> V3
  - context: Cutover-criteria en rollback-gates zijn nog niet geautomatiseerd, waardoor releasebeslissingen handmatig en foutgevoelig zijn.
  - acceptance:
    - Admin flow kan een cutover checklist evalueren met expliciete gate-pass/fail uitkomst.
    - Checklistresultaat bevat rollback-indicatie en traceerbare details per gate.
    - Routecontract en tests dekken success/fail scenario's en validatie.

- [x] WI-203 | type:feature | priority:P2 | status:DONE | title:i18n-ready UI (start NL-only met resource-based strings)
  - context: User-facing teksten staan hardcoded in iOS views en er is nog geen resource-structuur voor admin-web labels.
  - acceptance:
    - iOS user app gebruikt centrale string-resources (NL) i.p.v. hardcoded schermteksten.
    - Admin-web heeft resource-based labels als basis voor toekomstige React UI componenten.
    - Nieuwe stringstructuur is uitbreidbaar naar extra locales zonder grote refactor.

- [x] WI-202 | type:feature | priority:P2 | status:DONE | title:Dynamische kcal-profielen bovenop baseline datasets
  - context: Gold read-flow levert nu alleen exact ingestte kcal-combinaties; product vraagt afgeleide profielen zonder extra bron-ingest.
  - acceptance:
    - Week read-routes kunnen voor niet-baseline kcal een afgeleid profiel leveren vanuit dichtstbijzijnde baseline voor dezelfde week/basePersons.
    - Afgeleide grocery hoeveelheden zijn deterministisch geschaald en contractvorm blijft stabiel.
    - Baseline exact-match gedrag en not-found gedrag buiten week/basePersons scope blijven behouden.

- [x] WI-201 | type:feature | priority:P2 | status:DONE | title:Huishouden model met gezinshoofd + gezinslid uitnodigingen
  - context: V3 vereist een huishoudenmodel met uitnodigingen; huidige flow gebruikt alleen losse `householdId` zonder lidmaatschapsbeheer.
  - acceptance:
    - Gezinshoofd kan een huishouden opzetten en leden uitnodigen met een expliciete uitnodigingsstatus.
    - Uitgenodigd gezinslid kan uitnodiging accepteren waarna lidmaatschap van hetzelfde huishouden actief is.
    - User-routes valideren sessie-identiteit en tonen huishoud- en uitnodigingsstatus consistent.

- [x] WI-206 | type:chore | priority:P1 | status:DONE | title:Persistente opslag + migraties voor silver/gold/jobs/idempotency/audit
  - context: In-memory baselines zijn opgeleverd, maar productie vereist duurzame opslag en migratiepad.
  - acceptance:
    - Silver/gold/job/idempotency/audit data heeft persistente opslag met schema migraties.
    - Reprocess en reports blijven deterministisch met persistente reads/writes.

- [x] WI-205 | type:feature | priority:P1 | status:DONE | title:Match API routes en LLM finish-pass end-to-end wiring
  - context: Meerdere plannen sluiten af zonder `/api/v3/match` route wiring en zonder volledige finish-pass orkestratie.
  - acceptance:
    - `/api/v3/match/*` routes zijn beschikbaar met stabiele request/response contracten.
    - Shared matching core, review-loop en LLM adapter werken in één end-to-end flow.

- [x] WI-014 | type:chore | priority:P2 | status:DONE | title:Security/privacy baseline (auth, secret management, auditability)
  - context: Blueprint vereist secure-by-default en minimale dataverzameling.
  - acceptance:
    - Secrets staan niet in code en worden via env/secret store geladen.
    - Audit trail bevat kritieke mutaties en match/sync beslissingen.

- [x] WI-013 | type:chore | priority:P1 | status:DONE | title:Teststrategie en release-gates implementeren
  - context: V3 cutover vereist meetbare kwaliteit en parity met huidige baseline.
  - acceptance:
    - Unit/integration/E2E smoke suite draait in CI.
    - KPI gates voor top-1/top-3/review-rate/no-match-rate zijn meetbaar.

- [x] WI-012 | type:feature | priority:P1 | status:DONE | title:Observability, diagnostics, backup/restore en cleanup jobs
  - context: DoD eist aantoonbare operations tooling.
  - acceptance:
    - Health/diagnostics en job status zijn via `/api/v3/system` beschikbaar.
    - Backup/restore/cleanup heeft dry-run + execute pad met logging.

- [x] WI-011 | type:feature | priority:P1 | status:DONE | title:Admin web baseline (Data, Instellingen, Extract/Operations)
  - context: Beheerfuncties moeten strikt gescheiden blijven van user flow.
  - acceptance:
    - Ingest/recompute/config/cleanup routes zijn alleen via admin toegankelijk.
    - Admin sessie en user sessie zijn technisch gescheiden.

- [x] WI-010 | type:feature | priority:P1 | status:DONE | title:iOS user app baseline (Week -> Match -> Bestellen + offline cache)
  - context: Productdoel is mobile-first primaire flow.
  - acceptance:
    - 3 hoofdschermen werken met online backend.
    - Weekmenu + boodschappen zijn offline beschikbaar; sync blijft online-only.

- [x] WI-009 | type:feature | priority:P1 | status:DONE | title:Cart plan + idempotent sync naar Picnic + sync reports
  - context: Bestelstap moet veilig opnieuw uitvoerbaar zijn.
  - acceptance:
    - Sync endpoint is idempotent en levert eenduidig sync rapport.
    - Optionele dry-run bestaat alleen in beheer/debug flow.

- [x] WI-008 | type:feature | priority:P0 | status:DONE | title:LLM provider adapter met OpenAI/Azure preflight en fallback
  - context: Provider mismatch veroorzaakte eerder runtime failures.
  - acceptance:
    - Adapter valideert endpoint, deployment/model mapping en api-version vooraf.
    - LLM failures blokkeren de primaire flow niet; fallback pad is aantoonbaar.

- [x] WI-007 | type:feature | priority:P0 | status:DONE | title:Matching policy + review queue + feedback loop
  - context: Beslissingen high/medium/low moeten voorspelbaar en auditbaar zijn.
  - acceptance:
    - Decision gates (`high`, `medium`, `low`) werken met centrale thresholds.
    - Review acties (`map`, `skip`, `defer`) schrijven naar audit + overrides.

- [x] WI-006 | type:feature | priority:P0 | status:DONE | title:Shared matching core als single source of truth
  - context: Matching drift moet verdwijnen tussen reconcile en Picnic matching path.
  - acceptance:
    - Gedeelde match types/score helpers/ranker zijn geïntroduceerd.
    - Parity test toont gelijke base score bij gelijke input+candidates.

- [x] WI-005 | type:feature | priority:P0 | status:DONE | title:PG adapter op expliciet endpointcontract + contract tests
  - context: Endpointwijzigingen moeten gecontroleerd en testbaar zijn.
  - acceptance:
    - PG adapter gebruikt endpoint keys uit `PG_ENDPOINT_CONTRACT.md`.
    - Contract tests dekken login/week/day/recipe/shoppinglist response shape.

- [x] WI-004 | type:feature | priority:P0 | status:DONE | title:Gold serving layer + week/grocery API read-routes
  - context: App read-flow moet zonder externe API calls op gold kunnen draaien.
  - acceptance:
    - Gold views voor week plan, groceries, match status en cart plan bestaan.
    - `/api/v3/week/*` levert consistente data voor user app en admin.

- [x] WI-003 | type:feature | priority:P0 | status:DONE | title:Silver transform pipeline (normalize, canonicalize, reconcile, quality events)
  - context: Silver moet deterministisch en volledig herbouwbaar zijn vanuit bronze.
  - acceptance:
    - Silver tabellen voor meals/ingredients/quantities/reconcile/events bestaan.
    - Reprocess tooling kan een transformVersion opnieuw draaien.

- [x] WI-002 | type:feature | priority:P0 | status:DONE | title:Bronze ingest pipeline met manifest, integrity checks en retry/backoff
  - context: Raw-first bronarchitectuur is de kern van V3.
  - acceptance:
    - Ingest planner + runner kan week/kcal/basePersons combinaties uitvoeren.
    - Bronze objecten bevatten verplichte metadata + checksum validatie.

- [x] WI-001 | type:feature | priority:P0 | status:DONE | title:Milestone 0 foundations (scaffold, storage schema, config subsystem)
  - context: Blueprint milestone 0 vereist een harde basis voor alle vervolgfasen.
  - acceptance:
    - Project bevat modulegrenzen voor backend/admin/iOS/shared/infrastructure.
    - Config subsystem ondersteunt `hotReload`, `sensitive`, `restartRequired` metadata.

- [x] WI-000 | type:chore | priority:P1 | status:DONE | title:AI werkstructuur opgezet (agents, instructions, tracking, skill)

## Discovered Bugs

- [ ] WI-101 | type:bug | priority:P0 | status:TODO | title:Duplicatie matching/canonicalisatie veroorzaakt drift
  - found-in: legacy flow (server/reconcile/frontend/picnic matcher)
  - repro: identieke ingredienttekst geeft verschillende matchinguitkomst per pad

- [ ] WI-102 | type:bug | priority:P0 | status:TODO | title:LLM provider incompatibiliteit veroorzaakt runtime failures
  - found-in: providerconfig (Azure/OpenAI verschillen)
  - repro: verkeerde endpoint/api-version of token parameter geeft falende finish-pass

- [ ] WI-103 | type:bug | priority:P1 | status:TODO | title:Implicit basePersons aannames geven foutieve schaalberekening
  - found-in: quantity scaling logica
  - repro: dataset met afwijkende servings/porties schaalt onjuist door default-aannames

- [ ] WI-104 | type:bug | priority:P1 | status:TODO | title:Monolithische bestanden verhogen regressierisico
  - found-in: legacy web layer
  - repro: kleine wijziging in grote files veroorzaakt side-effects buiten doelroute

## New Features
