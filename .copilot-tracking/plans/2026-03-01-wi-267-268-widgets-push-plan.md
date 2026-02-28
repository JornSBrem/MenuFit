# Plan: WI-267 + WI-268 — iOS Widgets & Push Notifications

## Scope

### WI-267: WidgetKit Extension
1. Add App Group (`group.nl.menufit.shared`) entitlement to main app and widget extension
2. Create `SharedWidgetData.swift` — codable model + App Group read/write helpers
3. Update `UserFlowViewModel` to write current day meals to App Group after loading
4. Create `MenuFitWidget/` directory with WidgetKit extension:
   - `TodayMealsWidget` — small/medium/large family
   - `TimelineProvider` — reads from App Group cache
   - `WidgetViews` — SwiftUI views per size
5. Update `project.yml` with widget extension target + App Group capability
6. Regenerate Xcode project

### WI-268: Push Notifications
1. iOS side:
   - `PushNotificationManager.swift` — register for APNs, handle device token
   - Update `MenuFitUserApp.swift` with push delegate
   - Add notification categories (new menu, order status, reminder)
2. Backend side:
   - Add `deviceTokens` map to persistent state store
   - `POST /api/v3/push/register` — store device token per user
   - `POST /api/v3/push/unregister` — remove device token
   - `PushNotificationService` — APNs HTTP/2 sender (requires APNs key config)
3. Update `BackendAPI.swift` with register/unregister endpoints

## Impacted Files

### New Files
- `src/ios-user-app/App/SharedWidgetData.swift`
- `src/ios-user-app/App/PushNotificationManager.swift`
- `src/ios-user-app/MenuFitWidget/MenuFitWidget.swift`
- `src/ios-user-app/MenuFitWidget/TodayMealsWidget.swift`
- `src/ios-user-app/MenuFitWidget/Info.plist`
- `src/backend/application/push/push-notification-service.ts`

### Modified Files
- `src/ios-user-app/project.yml` — add widget target + entitlements
- `src/ios-user-app/App/MenuFitUserApp.swift` — push delegate
- `src/ios-user-app/App/UserFlowViewModel.swift` — write widget data
- `src/ios-user-app/App/UserFlowModels.swift` — push models
- `src/ios-user-app/App/BackendAPI.swift` — push endpoints
- `src/backend/server.ts` — push routes
- `src/backend/integrations/storage/persistent-state-store.ts` — device tokens

## Risks
- Widget extension requires App Group entitlement which needs Apple Developer account provisioning
- Push notifications require APNs key/certificate configuration on backend
- WidgetKit timeline refresh is controlled by iOS — no guaranteed real-time updates

## Out of Scope
- Rich push notifications with images/actions
- Interactive widgets (App Intents / WidgetKit interactivity)
- Lock Screen widgets
- Backend-triggered widget timeline reload via push
- APNs key provisioning and certificate management
- Push notification scheduling/queuing with retry logic
