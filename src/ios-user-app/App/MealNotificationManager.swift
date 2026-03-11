import Foundation
import UserNotifications

// MARK: - Meal Notification Manager

/// Plant lokale notificaties voor elk maaltijdmoment op basis van het weekmenu.
/// Gebruikt UNUserNotificationCenter — geen APNs/server push nodig.
final class MealNotificationManager {
  static let shared = MealNotificationManager()

  private let center = UNUserNotificationCenter.current()
  private let categoryId = "MEAL_REMINDER"

  private init() {}

  // MARK: Permission

  /// Vraag push-toestemming aan de gebruiker.
  func requestPermission() async -> Bool {
    do {
      let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
      if granted {
        await registerCategories()
        // Registreer ook voor remote APNs notifications
        PushRegistrationManager.shared.registerIfNeeded()
      }
      return granted
    } catch {
      return false
    }
  }

  /// Check huidige autorisatiestatus.
  func isAuthorized() async -> Bool {
    let settings = await center.notificationSettings()
    return settings.authorizationStatus == .authorized
  }

  // MARK: Scheduling

  /// Plan notificaties voor alle maaltijdmomenten van de komende 7 dagen.
  /// Verwijdert eerst bestaande maaltijd-notificaties.
  func scheduleMealNotifications(
    meals: [MealDayEntry],
    schedule: MealSchedule,
    startDate: Date = Date()
  ) async {
    // Verwijder oude maaltijd-notificaties
    center.removePendingNotificationRequests(withIdentifiers:
      await pendingMealNotificationIds()
    )

    let calendar = Calendar.current
    var requests: [UNNotificationRequest] = []

    for dayOffset in 0..<7 {
      guard let targetDate = calendar.date(byAdding: .day, value: dayOffset, to: startDate) else { continue }

      for moment in schedule.moments {
        let fireDate = moment.scheduledDate(on: targetDate, calendar: calendar)

        // Niet plannen als het tijdstip al voorbij is
        guard fireDate > Date() else { continue }

        // Vind het bijpassende meal voor deze dag + moment
        let dayLabel = dayLabelForDate(targetDate, calendar: calendar)
        let matchingMeal = meals.first { entry in
          normalizeDayLabel(entry.dayLabel) == normalizeDayLabel(dayLabel)
            && schedule.momentForMealLabel(entry.mealLabel)?.label == moment.label
        }

        let recipeName = matchingMeal?.recipeName ?? "Maaltijd"
        let kcalText = matchingMeal?.kcal.map { " · \($0) kcal" } ?? ""

        let content = UNMutableNotificationContent()
        content.title = "🍽 \(moment.label)"
        content.body = "\(recipeName)\(kcalText)"
        content.categoryIdentifier = categoryId
        content.sound = .default
        content.userInfo = [
          "mealLabel": moment.label,
          "dayLabel": dayLabel,
          "recipeName": recipeName,
        ]

        let components = calendar.dateComponents(
          [.year, .month, .day, .hour, .minute],
          from: fireDate
        )
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)

        let id = notificationId(moment: moment.label, date: targetDate, calendar: calendar)
        requests.append(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
      }
    }

    for request in requests {
      try? await center.add(request)
    }
  }

  /// Verwijder alle geplande maaltijd-notificaties.
  func removeAllMealNotifications() async {
    let ids = await pendingMealNotificationIds()
    center.removePendingNotificationRequests(withIdentifiers: ids)
  }

  // MARK: Helpers

  private func registerCategories() async {
    let category = UNNotificationCategory(
      identifier: categoryId,
      actions: [],
      intentIdentifiers: [],
      options: [.customDismissAction]
    )
    center.setNotificationCategories([category])
  }

  private func notificationId(moment: String, date: Date, calendar: Calendar) -> String {
    let day = calendar.component(.day, from: date)
    let month = calendar.component(.month, from: date)
    let year = calendar.component(.year, from: date)
    let slug = moment.lowercased().replacingOccurrences(of: " ", with: "-")
    return "menufit.meal.\(year)-\(month)-\(day).\(slug)"
  }

  private func pendingMealNotificationIds() async -> [String] {
    let pending = await center.pendingNotificationRequests()
    return pending
      .map(\.identifier)
      .filter { $0.hasPrefix("menufit.meal.") }
  }

  private func dayLabelForDate(_ date: Date, calendar: Calendar) -> String {
    let weekday = calendar.component(.weekday, from: date)
    switch weekday {
    case 2: return "maandag"
    case 3: return "dinsdag"
    case 4: return "woensdag"
    case 5: return "donderdag"
    case 6: return "vrijdag"
    case 7: return "zaterdag"
    case 1: return "zondag"
    default: return "maandag"
    }
  }

  private func normalizeDayLabel(_ value: String) -> String {
    value
      .lowercased()
      .folding(options: [.diacriticInsensitive, .widthInsensitive], locale: Locale(identifier: "nl_NL"))
      .trimmingCharacters(in: .whitespacesAndNewlines)
  }
}

// MARK: - Lightweight meal entry for notification scheduling

struct MealDayEntry {
  let dayLabel: String
  let mealLabel: String
  let recipeName: String?
  let kcal: Int?
}
