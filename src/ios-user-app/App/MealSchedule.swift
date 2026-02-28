import Foundation

// MARK: - Meal Moment Definition

/// Één maaltijdmoment met label en geplande tijd.
struct MealMoment: Codable, Identifiable, Equatable {
  let label: String
  /// Uren component (0–23)
  var hour: Int
  /// Minuten component (0–59)
  var minute: Int

  var id: String { label }

  /// Geeft Date terug voor vandaag op het geplande tijdstip.
  func scheduledDateToday(calendar: Calendar = .current) -> Date {
    var components = calendar.dateComponents([.year, .month, .day], from: Date())
    components.hour = hour
    components.minute = minute
    components.second = 0
    return calendar.date(from: components) ?? Date()
  }

  /// Geeft Date terug voor een specifieke datum op het geplande tijdstip.
  func scheduledDate(on date: Date, calendar: Calendar = .current) -> Date {
    var components = calendar.dateComponents([.year, .month, .day], from: date)
    components.hour = hour
    components.minute = minute
    components.second = 0
    return calendar.date(from: components) ?? date
  }

  /// Formaat "HH:mm"
  var timeString: String {
    String(format: "%02d:%02d", hour, minute)
  }
}

// MARK: - Meal Schedule

/// Volledig dagschema met standaard-/gebruikerstijdstippen per maaltijdmoment.
struct MealSchedule: Codable, Equatable {
  var moments: [MealMoment]

  /// Standaard schema
  static let `default` = MealSchedule(moments: [
    MealMoment(label: "Ontbijt",               hour: 7,  minute: 0),
    MealMoment(label: "Tussendoor (ochtend)",   hour: 10, minute: 30),
    MealMoment(label: "Lunch",                  hour: 12, minute: 0),
    MealMoment(label: "Tussendoor (middag)",    hour: 15, minute: 0),
    MealMoment(label: "Diner",                  hour: 17, minute: 30),
    MealMoment(label: "Snack",                  hour: 20, minute: 0),
  ])

  // MARK: Persistence

  private static let storageKey = "menufit.meal-schedule"

  static func load(defaults: UserDefaults = .standard) -> MealSchedule {
    guard let data = defaults.data(forKey: storageKey),
          let schedule = try? JSONDecoder().decode(MealSchedule.self, from: data)
    else {
      return .default
    }
    return schedule
  }

  func save(defaults: UserDefaults = .standard) {
    if let data = try? JSONEncoder().encode(self) {
      defaults.set(data, forKey: storageKey)
    }
    // Schrijf ook naar App Group zodat de widget dezelfde tijden kent
    if let shared = UserDefaults(suiteName: AppGroupConstants.suiteName),
       let data = try? JSONEncoder().encode(self) {
      shared.set(data, forKey: storageKey)
    }
  }

  // MARK: Next Meal Logic

  /// Geeft het eerstvolgende maaltijdmoment na `now`. Nil als alle momenten vandaag voorbij zijn.
  func nextMoment(after now: Date = Date(), calendar: Calendar = .current) -> MealMoment? {
    let sorted = moments.sorted { ($0.hour * 60 + $0.minute) < ($1.hour * 60 + $1.minute) }
    let currentMinutes = calendar.component(.hour, from: now) * 60 + calendar.component(.minute, from: now)
    return sorted.first { ($0.hour * 60 + $0.minute) > currentMinutes }
  }

  /// Geeft het huidige actieve maaltijdmoment (het moment dat nu of zojuist is geweest).
  func currentMoment(at now: Date = Date(), calendar: Calendar = .current) -> MealMoment? {
    let sorted = moments.sorted { ($0.hour * 60 + $0.minute) < ($1.hour * 60 + $1.minute) }
    let currentMinutes = calendar.component(.hour, from: now) * 60 + calendar.component(.minute, from: now)
    return sorted.last { ($0.hour * 60 + $0.minute) <= currentMinutes }
  }

  /// Match een mealLabel uit de API (bijv. "Diner", "Ontbijt") tegen het juiste moment.
  func momentForMealLabel(_ mealLabel: String) -> MealMoment? {
    let normalized = mealLabel.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
    return moments.first { moment in
      let momentNormalized = moment.label.lowercased()
      return momentNormalized == normalized
        || normalized.contains(momentNormalized)
        || momentNormalized.contains(normalized)
    }
  }
}
