# WI-274 Changes

## Summary
- live ProjectGezond webapp geaudit met ingelogde sessie op home, recepten, filterpaneel, Mijn PG en weegmomenten
- recept parity-gap in MenuFit gedicht met rijkere browse/search/filter UI op lokale recipe-catalog data
- resterende parity-kloof voor voortgang en weegmomenten expliciet als vervolgworkitem vastgelegd

## Findings
- ProjectGezond receptenoverzicht biedt zoekfunctie op recept/ingrediënt, snelle filters per maaltijdtype, uitgebreid filterpaneel op taxonomie en raster/lijstweergave
- ProjectGezond heeft daarnaast aparte voortgangs- en weegmomentenflows (`#/mijn-pg`, `#/pagina/weegmomenten`) die MenuFit nog niet functioneel afdekt

## Files
- `src/ios-user-app/App/RecipesScreen.swift`
- `src/ios-user-app/App/UserFlowViewModel.swift`
- `workitems/workitems.md`

## Verification
- live audit via Playwright tegen `https://app.projectgezond.nl` met authenticated session
- `xcodebuild -project src/ios-user-app/MenuFitUserApp.xcodeproj -target MenuFitUserApp -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO build`

## Notes
- iOS buildvalidatie wordt nog geblokkeerd door bestaande watch-target product-type configuratie voor `iphonesimulator`, niet door de nieuwe receptenbrowse wijzigingen
- ⚠️ requires-xcode — runtime tests niet end-to-end op device gevalideerd
