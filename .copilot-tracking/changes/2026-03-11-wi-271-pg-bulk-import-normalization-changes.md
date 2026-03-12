# WI-271 Changes

## Summary
- verlegd van legacy ProjectGezond `v3` recipe/week endpoints naar de actuele `/api/week-menu/{week}` en `/api/recipe/{slug}` contracten
- persistente receptcatalogus toegevoegd aan de backend state-store zodat MenuFit recepten, nutrition, tips en gekoppelde dagmenu's lokaal blijft serveren
- bulk ingest uitgebreid zodat na weekimport automatisch alle unieke receptslugs worden opgehaald en genormaliseerd opgeslagen
- iOS receptdetail uitgebreid om intro, voedingswaarden, tips, bereidingstijd en gekoppelde dagmenu's uit de eigen MenuFit backend te tonen

## Files
- `src/backend/integrations/pg/pg-recipe-normalizer.ts`
- `src/backend/server.ts`
- `src/backend/application/gold/types.ts`
- `src/backend/application/gold/read-service.ts`
- `src/backend/integrations/storage/persistent-state-store.ts`
- `src/backend/integrations/pg/endpoint-contract.ts`
- `src/shared/config/default-definitions.ts`
- `src/ios-user-app/App/UserFlowModels.swift`
- `src/ios-user-app/App/WeekScreen.swift`
- `docs/PG_ENDPOINT_CONTRACT.md`

## Verification
- `node --test src/backend/application/gold/read-service.test.ts src/backend/integrations/storage/persistent-state-store.test.ts src/backend/integrations/pg/endpoint-contract.test.ts`
- `node --input-type=module -e "await import('./src/backend/server.ts'); setTimeout(() => process.exit(0), 200);"`
- `xcodebuild -project src/ios-user-app/MenuFitUserApp.xcodeproj -scheme MenuFitUserApp -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`

## Notes
- de iOS build faalt momenteel niet op de nieuwe recipe-wijzigingen maar op bestaande watch target product-type configuratie voor `iphonesimulator`
- ⚠️ requires-xcode — runtime tests niet lokaal end-to-end op device gevalideerd
