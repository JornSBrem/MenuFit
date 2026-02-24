# Refactor Simplification Plan (PG -> Picnic)

## Doel

Breng de applicatie terug naar een eenvoudige, voorspelbare flow:

1. haal weekdata op uit Project Gezond;
2. bereken benodigde hoeveelheden per huishouden/person-plan;
3. match producten bij Picnic (deterministisch eerst, LLM alleen voor twijfelgevallen);
4. zet bestelling in Picnic winkelwagen.

## Source of Truth (raw-first)

- `out/exports/raw` is de primaire brondata (source of truth).
- Doel is eenmalig de volledige bron op te bouwen (jaar/weken/kcal/person-plans), daarna lokaal herberekenen.
- Afgeleide bestanden (week export, match-resultaten, rapporten) worden altijd uit raw opgebouwd.
- PG opnieuw benaderen alleen bij expliciete refresh/rebuild, niet bij normale app-flow.

## Release Strategie (V1 + V2 parallel)

- V1 blijft operationeel/stabiel (bugfix-only).
- V2 wordt als nieuw parallel project opgebouwd (clean slate in TypeScript).
- Parity checks tussen V1 en V2 (week output, hoeveelheden, matching coverage) bepalen cutover.
- Pas na stabiele parity wordt V2 de default.

## Kernproblemen nu

- Te veel logica in grote bestanden (`src/web/server.ts`, `src/web/frontend.ts`).
- Duplicatie in matching/canonicalisatie op meerdere plekken (server, reconcile, frontend, picnic matcher).
- LLM-flow is verweven met routing/UI, waardoor foutdiagnose en fallback moeilijker wordt.

## Gewenste architectuur

## 1) Domeinlaag (pure logica)

- `src/domain/planning/*`
  - hoeveelheidberekening uit weekmenu + person-plan
  - unit-normalisatie + pack rounding
- `src/domain/matching/*`
  - canonicalisatie/synoniemen (single source of truth)
  - score/ranking policy
  - confidence gates (high/medium/low)
- `src/domain/cart/*`
  - opbouw van cart-commando's uit gematchte boodschappen

Regel: geen HTTP, geen file IO, geen UI in deze laag.

## 2) Integratielaag

- `src/integrations/pg/*` (PG API + raw/export IO)
- `src/integrations/picnic/*` (Picnic API)
- `src/integrations/llm/*` (OpenAI/Azure adapter + compatibility fallbacks)

Regel: alleen externe systemen; geen business beslissingen.

## 3) Use-case laag

- `src/app/usecases/*`
  - `buildWeekDemand`
  - `runProductMatching`
  - `runLlmFinishPass`
  - `syncCart`

Regel: orkestratie van domein + integraties.

## 4) Web laag

- `src/web/routes/*` per feature:
  - `weekRoutes.ts`
  - `matchRoutes.ts`
  - `picnicRoutes.ts`
  - `settingsRoutes.ts`
- server.ts alleen bootstrap + route-registratie.

## Matching strategie (simpel houden)

1. Deterministisch: exact/synoniem/token matching + retrieval top-k.
2. Alleen bij medium confidence: LLM kiest uit top-k (nooit free-form product).
3. Low confidence/no-match: review queue.
4. Reviewbesluiten worden mapping feedback.

LLM is dus een afrondlaag, niet de basis.

## Mobile-first UX (iPhone)

Houd de hoofdflow op 3 schermen:

1. **Week**: kies week + person-plan, toon compacte boodschappenlijst.
2. **Match**: dekking + unresolved + knop "LLM finish".
3. **Bestellen**: dry-run + "sync naar Picnic".

Designregels:
- grote tap-targets;
- 1 primaire CTA per scherm;
- geen admin/debug-info in de primaire flow (aparte "Advanced").

## Hosting op Proxmox (lokaal)

- Docker Compose met 1 app-container.
- Persistente volume voor `out/` en `.env`.
- Reverse proxy (Caddy/Traefik/Nginx) voor lokaal TLS.
- Health endpoint + simpele backup van `out/exports` en mappings.

## Gefaseerde uitvoering

## Fase 0: Boundaries trekken (laag risico)

- verplaats pure matching helpers naar domeinmodule;
- frontend canonicalisatie duplicatie verwijderen (server levert canonical fields);
- start split van `server.ts` routes.

## Fase 1: Use-cases introduceren

- matchflow, llm-finish en cart-sync via use-case services;
- web routes worden dunne wrappers.

## Fase 2: UI simplificatie

- mobiele 3-stappen flow;
- advanced/settings verplaatsen uit hoofdpad.

## Fase 3: opschonen

- legacy duplicate code verwijderen;
- regressietests voor week 9 en andere edge cases als gate.
