# MenuFit Workitems

## Backlog

- [ ] WI-222 | type:chore | priority:P2 | status:TODO | title:Externe observability stack provisioning (Prometheus/Grafana) voor productie
  - context: WI-211 levert interne telemetry export, maar provisioning/operationalisatie van externe observability stack bleef out-of-scope.
  - acceptance:
    - Prometheus scrape en Grafana dashboards zijn ingericht voor backend route/security/job metrics.
    - Alertregels voor fout- en blocked-rates zijn gekoppeld aan operationele escalatiekanalen.

- [ ] WI-223 | type:chore | priority:P2 | status:TODO | title:Netwerk-level WAF/CDN policy configuratie voor productie ingress
  - context: WI-211 levert applicatie-level WAF guards; edge/network WAF policies zijn nog niet ingericht.
  - acceptance:
    - Ingress heeft afdwingbare WAF/CDN rulesets voor OWASP-baseline en rate controls op kritieke endpoints.
    - Deploybare configuratie is traceerbaar versiebeheer met rollbackpad.

- [ ] WI-224 | type:chore | priority:P2 | status:TODO | title:Cloud deployment provisioning voor productie-omgeving
  - context: WI-212 levert delivery guardrails en checks, maar volledige cloud provisioning blijft out-of-scope.
  - acceptance:
    - Productie infrastructuur provisioning (compute/network/secrets/observability basis) is geautomatiseerd en reproduceerbaar.
    - Provisioningpad bevat rollback/rollback-safe documentatie en validatiechecks.

- [ ] WI-213 | type:feature | priority:P2 | status:TODO | title:Relationele database runtime-integratie voor persistente domeinen
  - context: WI-206 noemt volledige relationele database-integratie expliciet als out-of-scope.
  - acceptance:
    - Persistente opslag gebruikt een relationele runtime (bijv. Postgres/SQLite) i.p.v. alleen file/in-memory opslag.
    - Migraties en runtime toegangspaden zijn consistent voor silver/gold/jobs/idempotency/audit.

- [ ] WI-214 | type:chore | priority:P2 | status:TODO | title:Distributed locking en multi-process write coördinatie
  - context: WI-206 sluit gelijktijdige multi-process write coördinatie expliciet uit.
  - acceptance:
    - Kritieke write-paden hebben distributed locking of equivalente lease/coördinatie.
    - Gelijktijdige writes veroorzaken geen dubbele of corrupte state-overgangen.

- [ ] WI-215 | type:chore | priority:P3 | status:TODO | title:iOS UI testautomatisering via Xcode simulator in CI
  - context: Teststrategie-plan sluit volledige mobile UI test automation expliciet uit.
  - acceptance:
    - Baseline iOS UI smoke-tests draaien geautomatiseerd op simulator in CI.
    - Regressies op primaire flow (Week -> Match -> Bestellen) worden in pipeline gedetecteerd.

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

## In Progress

_None_

## Done

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
