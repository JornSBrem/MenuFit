# Database Platform Decision (MVP): Supabase vs huidige Postgres stack

## Datum

2026-02-25

## Context

MenuFit MVP draait al op een eigen backend-architectuur met:

- bestaande auth/session lifecycle service
- bestaande household, matching, cart en admin routes
- bestaande persistent state store met Postgres pad

WI-247 vraagt een expliciete keuze: doorgaan op huidige Postgres stack of nu overstappen naar Supabase.

## Vergelijking

### 1. Auth integratie

- Huidige stack:
  - sluit direct aan op bestaande `session-lifecycle-service`
  - geen directe herbouw van token- en role-model nodig
- Supabase:
  - sterke managed auth, maar vereist herontwerp van huidige token/session contracten
  - extra migratiecomplexiteit in iOS/admin clients en backend middleware

Beoordeling voor MVP: voordeel huidige stack.

### 2. Security / RLS

- Huidige stack:
  - security nu vooral in application/service laag
  - RLS niet standaard ingebouwd, extra werk indien gewenst
- Supabase:
  - native Postgres RLS + policy model
  - sterk voor multi-tenant data-afscherming

Beoordeling voor MVP: Supabase sterker op lange termijn, maar kost nu extra implementatietijd.

### 3. Operations

- Huidige stack:
  - team houdt controle over deploy/runbook
  - operationele lasten blijven intern
- Supabase:
  - managed platform verlaagt DB/Auth beheerlast
  - extra afhankelijkheid op platformfeatures en projectconfig

Beoordeling voor MVP: gelijkwaardig, afhankelijk van teamcapaciteit; huidige stack heeft minder migratierisico.

### 4. Kosten

- Huidige stack:
  - voorspelbare infra-kosten binnen bestaande omgeving
  - meer interne operationele tijd
- Supabase:
  - potentieel lagere time-to-operate
  - kosten schalen met managed services/features

Beoordeling voor MVP: geen directe kostenwinst die migratierisico rechtvaardigt.

### 5. Vendor lock-in

- Huidige stack:
  - laag, standaard Postgres + eigen services
- Supabase:
  - medium, door auth/storage/realtime coupling in platform APIs

Beoordeling voor MVP: huidige stack gunstiger.

## Besluit

Voor MVP kiezen we: **doorgaan op huidige Postgres stack**.

Rationale:

1. laagste delivery-risico voor openstaande MVP workitems (iOS/admin functionaliteit)
2. minimale verstoring van bestaande auth/session en backend contracts
3. sneller naar eerste testbare versie met bestaande architectuur

## Adoptie-/migratiepad (als Supabase later alsnog gewenst is)

### Fase 1: Isoleren (nu)

- houd database toegang via duidelijke repository/adapters
- vermijd directe DB-specifieke leakage in UI/API contracts

### Fase 2: Voorbereiden

- voeg compatibiliteitslaag toe voor auth claim mapping
- definieer RLS-policy model op basis van huidige household/user boundaries

### Fase 3: Pilot

- dual-run in non-prod: huidige Postgres + Supabase mirror
- vergelijk functionele parity op household, recipes, weekmenu reads/writes

### Fase 4: Cutover

- gefaseerde route-switch per capability (bijv. eerst recipe read, dan write)
- actieve metrics/alerts op auth, latency, error-rate

## Rollbackstrategie

1. Houd huidige Postgres als source-of-truth tot volledige pilot parity.
2. Cutover alleen per omkeerbare routegroep.
3. Bij regressie: routefeature flags terugzetten naar huidige stack binnen dezelfde release window.
4. Geen destructieve schemawijzigingen zonder backward-compatible migraties.

## Risico's en mitigatie

- Risico: uitgestelde Supabase keuze creëert technische schuld.
  - Mitigatie: adaptergrenzen en expliciete follow-up workitems.
- Risico: security-policy verschillen pas laat zichtbaar.
  - Mitigatie: vroeg policy-model documenteren en pilot met productieachtige data.
