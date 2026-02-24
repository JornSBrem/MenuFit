import Foundation

enum AppLocale: String {
  case nl
}

enum L10nKey: String {
  case tabWeek
  case tabMatch
  case tabOrder
  case weekSettingsSection
  case yearStepper
  case weekStepper
  case kcalStepper
  case basePersonsStepper
  case loadWeekDataButton
  case statusSection
  case loading
  case offlineCacheActive
  case onlineData
  case weekOverviewSection
  case weekPlanId
  case mealCount
  case coverage
  case openIssues
  case groceriesSection
  case weekNavigationTitle
  case matchStatusSection
  case totalItems
  case resolvedItems
  case unresolvedItems
  case noWeekDataLoaded
  case reconcileDetailsSection
  case matchNavigationTitle
  case cartPlanSection
  case planId
  case cartItems
  case orderSection
  case syncCartOnlineButton
  case loadWeekBeforeOrder
  case lastSyncReportSection
  case reportId
  case status
  case syncedCount
  case failedCount
  case replay
  case replayYes
  case replayNo
  case externalCart
  case errorSection
  case orderNavigationTitle
  case offlineDataLoaded
  case loadWeekOnlineOrOfflineFailed
  case loadWeekFirst
  case cartSyncFailedOnlineOnly
  case backendInvalidBaseUrl
  case backendInvalidResponse
}

struct AppStrings {
  static var locale: AppLocale = .nl

  private static let nl: [L10nKey: String] = [
    .tabWeek: "Week",
    .tabMatch: "Match",
    .tabOrder: "Bestellen",
    .weekSettingsSection: "Week instellingen",
    .yearStepper: "Jaar: %d",
    .weekStepper: "Week: %d",
    .kcalStepper: "Kcal: %d",
    .basePersonsStepper: "Basis personen: %d",
    .loadWeekDataButton: "Laad weekdata",
    .statusSection: "Status",
    .loading: "Laden...",
    .offlineCacheActive: "Offline cache actief",
    .onlineData: "Online data",
    .weekOverviewSection: "Weekoverzicht",
    .weekPlanId: "Weekplan ID: %@",
    .mealCount: "Maaltijden: %d",
    .coverage: "Dekking: %d%%",
    .openIssues: "Open issues: %d",
    .groceriesSection: "Boodschappen",
    .weekNavigationTitle: "Week",
    .matchStatusSection: "Matching status",
    .totalItems: "Totaal items: %d",
    .resolvedItems: "Resolved: %d",
    .unresolvedItems: "Unresolved: %d",
    .noWeekDataLoaded: "Nog geen weekdata geladen.",
    .reconcileDetailsSection: "Reconcile details",
    .matchNavigationTitle: "Match",
    .cartPlanSection: "Cart plan",
    .planId: "Plan ID: %@",
    .cartItems: "Items: %d",
    .orderSection: "Bestellen",
    .syncCartOnlineButton: "Sync naar Picnic (online)",
    .loadWeekBeforeOrder: "Laad eerst weekdata om te kunnen bestellen.",
    .lastSyncReportSection: "Laatste sync report",
    .reportId: "Report ID: %@",
    .status: "Status: %@",
    .syncedCount: "Synced: %d",
    .failedCount: "Failed: %d",
    .replay: "Replay: %@",
    .replayYes: "ja",
    .replayNo: "nee",
    .externalCart: "External cart: %@",
    .errorSection: "Fout",
    .orderNavigationTitle: "Bestellen",
    .offlineDataLoaded: "Offline data geladen: %@",
    .loadWeekOnlineOrOfflineFailed: "Kon weekdata niet online of uit offline cache laden.",
    .loadWeekFirst: "Laad eerst weekdata.",
    .cartSyncFailedOnlineOnly: "Winkelwagen sync mislukt (alleen online): %@",
    .backendInvalidBaseUrl: "Backend basis-URL is ongeldig.",
    .backendInvalidResponse: "Backend response kon niet worden verwerkt.",
  ]

  static func text(_ key: L10nKey, _ arguments: CVarArg...) -> String {
    let template = resource(for: key)
    guard !arguments.isEmpty else {
      return template
    }
    return String(format: template, locale: localeValue(), arguments: arguments)
  }

  private static func resource(for key: L10nKey) -> String {
    switch locale {
    case .nl:
      return nl[key] ?? key.rawValue
    }
  }

  private static func localeValue() -> Locale {
    switch locale {
    case .nl:
      return Locale(identifier: "nl_NL")
    }
  }
}
