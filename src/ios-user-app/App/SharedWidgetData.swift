import Foundation
import WidgetKit

// MARK: - App Group Constants

enum AppGroupConstants {
  static let suiteName = "group.nl.menufit.shared"
  static let todayMealsKey = "todayMeals"
  static let grocerySummaryKey = "grocerySummary"
  static let lastUpdatedKey = "lastUpdated"
  static let mealScheduleKey = "menufit.meal-schedule"
}

// MARK: - Shared Widget Models

/// Lichtgewicht model voor widget timeline — geen zware API types nodig.
struct WidgetMealEntry: Codable, Identifiable {
  let mealId: String
  let mealLabel: String
  let recipeName: String?
  let imageUrl: String?
  let kcal: Int?
  /// Geplande uur (0–23) vanuit MealSchedule
  let scheduledHour: Int?
  /// Geplande minuut (0–59) vanuit MealSchedule
  let scheduledMinute: Int?

  var id: String { mealId }

  /// Geformatteerde tijd "HH:mm" of nil
  var scheduledTimeString: String? {
    guard let h = scheduledHour, let m = scheduledMinute else { return nil }
    return String(format: "%02d:%02d", h, m)
  }
}

struct WidgetGrocerySummary: Codable {
  let totalItems: Int
  let checkedItems: Int
  let topItems: [String]
}

struct WidgetDayData: Codable {
  let dayLabel: String
  let year: Int
  let week: Int
  let meals: [WidgetMealEntry]
  let grocerySummary: WidgetGrocerySummary?
  let updatedAt: Date
}

// MARK: - App Group Writer (called from main app)

enum WidgetDataWriter {
  private static var sharedDefaults: UserDefaults? {
    UserDefaults(suiteName: AppGroupConstants.suiteName)
  }

  static func writeTodayMeals(_ meals: [WidgetMealEntry], dayLabel: String, year: Int, week: Int) {
    guard let defaults = sharedDefaults else { return }
    let data = WidgetDayData(
      dayLabel: dayLabel,
      year: year,
      week: week,
      meals: meals,
      grocerySummary: nil,
      updatedAt: Date()
    )
    if let encoded = try? JSONEncoder().encode(data) {
      defaults.set(encoded, forKey: AppGroupConstants.todayMealsKey)
      defaults.set(Date().timeIntervalSince1970, forKey: AppGroupConstants.lastUpdatedKey)
    }
    // Notify WidgetKit to refresh timelines
    WidgetCenter.shared.reloadAllTimelines()
  }

  static func writeGrocerySummary(_ summary: WidgetGrocerySummary) {
    guard let defaults = sharedDefaults else { return }
    if let encoded = try? JSONEncoder().encode(summary) {
      defaults.set(encoded, forKey: AppGroupConstants.grocerySummaryKey)
    }
    WidgetCenter.shared.reloadAllTimelines()
  }
}

// MARK: - App Group Reader (called from widget extension)

enum WidgetDataReader {
  private static var sharedDefaults: UserDefaults? {
    UserDefaults(suiteName: AppGroupConstants.suiteName)
  }

  static func readTodayData() -> WidgetDayData? {
    guard let defaults = sharedDefaults,
          let jsonData = defaults.data(forKey: AppGroupConstants.todayMealsKey)
    else { return nil }
    return try? JSONDecoder().decode(WidgetDayData.self, from: jsonData)
  }

  static func readGrocerySummary() -> WidgetGrocerySummary? {
    guard let defaults = sharedDefaults,
          let jsonData = defaults.data(forKey: AppGroupConstants.grocerySummaryKey)
    else { return nil }
    return try? JSONDecoder().decode(WidgetGrocerySummary.self, from: jsonData)
  }

  static func readMealSchedule() -> MealSchedule {
    guard let defaults = sharedDefaults,
          let data = defaults.data(forKey: AppGroupConstants.mealScheduleKey),
          let schedule = try? JSONDecoder().decode(MealSchedule.self, from: data)
    else { return .default }
    return schedule
  }

  /// Bepaal het eerstvolgende maaltijdmoment en het bijbehorende gerecht.
  static func nextMealEntry(now: Date = Date()) -> (moment: MealMoment, meal: WidgetMealEntry?)? {
    let schedule = readMealSchedule()
    guard let nextMoment = schedule.nextMoment(after: now) else { return nil }
    let todayData = readTodayData()
    let matchingMeal = todayData?.meals.first { entry in
      entry.mealLabel.lowercased().contains(nextMoment.label.lowercased())
        || nextMoment.label.lowercased().contains(entry.mealLabel.lowercased())
    }
    return (nextMoment, matchingMeal)
  }
}
