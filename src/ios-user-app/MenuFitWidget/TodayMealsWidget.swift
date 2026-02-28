import WidgetKit
import SwiftUI

// MARK: - Timeline Entry

struct NextMealTimelineEntry: TimelineEntry {
  let date: Date
  let mealLabel: String
  let recipeName: String?
  let kcal: Int?
  let scheduledTime: String?
  let icon: String
  let accentColor: Color
  let allMeals: [WidgetMealEntry]
  let isEmpty: Bool
}

// MARK: - Timeline Provider

struct NextMealTimelineProvider: TimelineProvider {
  func placeholder(in context: Context) -> NextMealTimelineEntry {
    NextMealTimelineEntry(
      date: Date(),
      mealLabel: "Diner",
      recipeName: "Pasta Bolognese",
      kcal: 650,
      scheduledTime: "17:30",
      icon: "moon.stars.fill",
      accentColor: .indigo,
      allMeals: [],
      isEmpty: false
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (NextMealTimelineEntry) -> Void) {
    completion(buildEntry(for: Date()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<NextMealTimelineEntry>) -> Void) {
    let now = Date()
    let schedule = WidgetDataReader.readMealSchedule()
    var entries: [NextMealTimelineEntry] = []

    // Maak een entry voor elk maaltijdmoment vandaag (zodat widget automatisch wisselt)
    let sortedMoments = schedule.moments.sorted { ($0.hour * 60 + $0.minute) < ($1.hour * 60 + $1.minute) }

    for (index, moment) in sortedMoments.enumerated() {
      let entryDate = moment.scheduledDateToday()
      // De entry moet actief worden bij het *vorige* moment (of middernacht voor het eerste)
      let activationDate: Date
      if index == 0 {
        // Middernacht
        var components = Calendar.current.dateComponents([.year, .month, .day], from: now)
        components.hour = 0
        components.minute = 0
        activationDate = Calendar.current.date(from: components) ?? now
      } else {
        activationDate = sortedMoments[index - 1].scheduledDateToday()
      }

      if activationDate >= now || entryDate > now {
        entries.append(buildEntry(for: max(activationDate, now), targetMoment: moment))
      }
    }

    // Fallback: altijd minstens een huidige entry
    if entries.isEmpty {
      entries.append(buildEntry(for: now))
    }

    // Ververs morgen om 00:00
    var tomorrow = Calendar.current.dateComponents([.year, .month, .day], from: now)
    tomorrow.day! += 1
    tomorrow.hour = 0
    tomorrow.minute = 0
    let refreshDate = Calendar.current.date(from: tomorrow) ?? now.addingTimeInterval(3600)

    let timeline = Timeline(entries: entries, policy: .after(refreshDate))
    completion(timeline)
  }

  private func buildEntry(for date: Date, targetMoment: MealMoment? = nil) -> NextMealTimelineEntry {
    let schedule = WidgetDataReader.readMealSchedule()
    let todayData = WidgetDataReader.readTodayData()
    let allMeals = todayData?.meals ?? []

    let moment: MealMoment?
    if let target = targetMoment {
      moment = target
    } else {
      moment = schedule.nextMoment(after: date) ?? schedule.moments.first
    }

    guard let m = moment else {
      return NextMealTimelineEntry(
        date: date, mealLabel: "MenuFit", recipeName: nil, kcal: nil,
        scheduledTime: nil, icon: "fork.knife", accentColor: .orange,
        allMeals: allMeals, isEmpty: true
      )
    }

    // Match meal label
    let matchingMeal = allMeals.first { entry in
      let entryNorm = entry.mealLabel.lowercased()
      let momentNorm = m.label.lowercased()
      return entryNorm.contains(momentNorm) || momentNorm.contains(entryNorm)
    }

    return NextMealTimelineEntry(
      date: date,
      mealLabel: m.label,
      recipeName: matchingMeal?.recipeName,
      kcal: matchingMeal?.kcal,
      scheduledTime: m.timeString,
      icon: mealIcon(m.label),
      accentColor: mealColor(m.label),
      allMeals: allMeals,
      isEmpty: false
    )
  }

  private func mealIcon(_ label: String) -> String {
    switch label {
    case "Ontbijt":               return "sunrise.fill"
    case "Tussendoor (ochtend)":  return "cup.and.saucer.fill"
    case "Lunch":                 return "sun.max.fill"
    case "Tussendoor (middag)":   return "leaf.fill"
    case "Diner":                 return "moon.stars.fill"
    case "Snack":                 return "star.fill"
    default:                      return "fork.knife"
    }
  }

  private func mealColor(_ label: String) -> Color {
    switch label {
    case "Ontbijt":               return .yellow
    case "Tussendoor (ochtend)":  return .brown
    case "Lunch":                 return .orange
    case "Tussendoor (middag)":   return .green
    case "Diner":                 return .indigo
    case "Snack":                 return .purple
    default:                      return .orange
    }
  }
}

// MARK: - Widget Definition

struct TodayMealsWidget: Widget {
  let kind = "nl.menufit.widget.next-meal"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: NextMealTimelineProvider()) { entry in
      NextMealWidgetView(entry: entry)
        .containerBackground(.fill.tertiary, for: .widget)
    }
    .configurationDisplayName("Volgend eetmoment")
    .description("Toont je volgende maaltijd en wat je moet eten.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

// MARK: - Widget Views

struct NextMealWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: NextMealTimelineEntry

  var body: some View {
    switch family {
    case .systemSmall:
      smallView
    case .systemMedium:
      mediumView
    case .systemLarge:
      largeView
    default:
      smallView
    }
  }

  // MARK: Small — Volgende maaltijd

  private var smallView: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack(spacing: 6) {
        Image(systemName: entry.icon)
          .font(.title3.bold())
          .foregroundStyle(entry.accentColor)
        if let time = entry.scheduledTime {
          Text(time)
            .font(.caption.bold())
            .foregroundStyle(.secondary)
        }
      }

      Text(entry.mealLabel)
        .font(.headline)
        .lineLimit(1)

      if let recipe = entry.recipeName {
        Text(recipe)
          .font(.subheadline)
          .foregroundStyle(.primary)
          .lineLimit(2)
          .fixedSize(horizontal: false, vertical: true)
      } else if entry.isEmpty {
        Text("Geen data")
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      Spacer(minLength: 0)

      if let kcal = entry.kcal {
        HStack(spacing: 3) {
          Image(systemName: "flame.fill")
            .font(.caption2)
            .foregroundStyle(.orange)
          Text("\(kcal) kcal")
            .font(.caption.bold())
            .foregroundStyle(.orange)
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(4)
  }

  // MARK: Medium — Volgende maaltijd + context

  private var mediumView: some View {
    HStack(spacing: 16) {
      // Links: volgend moment
      VStack(alignment: .leading, spacing: 6) {
        HStack(spacing: 6) {
          Image(systemName: entry.icon)
            .font(.title2.bold())
            .foregroundStyle(entry.accentColor)
          VStack(alignment: .leading, spacing: 1) {
            Text("Volgende")
              .font(.caption2)
              .foregroundStyle(.secondary)
            Text(entry.mealLabel)
              .font(.headline)
          }
        }

        if let recipe = entry.recipeName {
          Text(recipe)
            .font(.subheadline.weight(.medium))
            .lineLimit(2)
        }

        Spacer(minLength: 0)

        HStack(spacing: 8) {
          if let time = entry.scheduledTime {
            Label(time, systemImage: "clock")
              .font(.caption.bold())
              .foregroundStyle(.secondary)
          }
          if let kcal = entry.kcal {
            Label("\(kcal) kcal", systemImage: "flame.fill")
              .font(.caption.bold())
              .foregroundStyle(.orange)
          }
        }
      }

      // Rechts: komende maaltijden
      if entry.allMeals.count > 1 {
        Divider()
        VStack(alignment: .leading, spacing: 4) {
          Text("Vandaag")
            .font(.caption2.bold())
            .foregroundStyle(.secondary)
          ForEach(entry.allMeals.prefix(4)) { meal in
            HStack(spacing: 4) {
              Circle()
                .fill(mealDotColor(meal.mealLabel))
                .frame(width: 6, height: 6)
              Text(meal.mealLabel)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }
          }
          Spacer(minLength: 0)
        }
      }
    }
    .padding(4)
  }

  // MARK: Large — Volledig dagschema

  private var largeView: some View {
    VStack(alignment: .leading, spacing: 8) {
      // Header
      HStack {
        Image(systemName: "fork.knife")
          .font(.title3.bold())
          .foregroundStyle(.orange)
        Text("Dagmenu")
          .font(.headline)
        Spacer()
        if let time = entry.scheduledTime {
          Label("Volgende: \(time)", systemImage: "clock.fill")
            .font(.caption.bold())
            .foregroundStyle(.orange)
        }
      }

      Divider()

      if entry.allMeals.isEmpty {
        Spacer()
        VStack(spacing: 8) {
          Image(systemName: "tray")
            .font(.largeTitle)
            .foregroundStyle(.secondary)
          Text("Open MenuFit om je weekmenu te laden")
            .font(.caption)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        Spacer()
      } else {
        ForEach(entry.allMeals) { meal in
          let isNext = meal.mealLabel.lowercased().contains(entry.mealLabel.lowercased())
            || entry.mealLabel.lowercased().contains(meal.mealLabel.lowercased())

          HStack(spacing: 10) {
            RoundedRectangle(cornerRadius: 2)
              .fill(isNext ? Color.orange : mealDotColor(meal.mealLabel))
              .frame(width: 3, height: 32)

            VStack(alignment: .leading, spacing: 2) {
              HStack(spacing: 4) {
                Text(meal.mealLabel)
                  .font(.caption.bold())
                  .foregroundStyle(isNext ? .primary : .secondary)
                if let time = meal.scheduledTimeString {
                  Text(time)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                }
              }
              if let recipe = meal.recipeName {
                Text(recipe)
                  .font(.subheadline.weight(isNext ? .semibold : .regular))
                  .lineLimit(1)
              }
            }

            Spacer()

            if let kcal = meal.kcal {
              Text("\(kcal)")
                .font(.caption.bold())
                .foregroundStyle(.orange)
            }

            if isNext {
              Image(systemName: "arrow.right.circle.fill")
                .foregroundStyle(.orange)
                .font(.caption)
            }
          }
          .padding(.vertical, 2)
          .background(
            isNext
              ? RoundedRectangle(cornerRadius: 8).fill(Color.orange.opacity(0.08))
              : RoundedRectangle(cornerRadius: 8).fill(Color.clear)
          )
        }
      }

      Spacer(minLength: 0)
    }
    .padding(4)
  }

  private func mealDotColor(_ label: String) -> Color {
    switch label.lowercased() {
    case let l where l.contains("ontbijt"):     return .yellow
    case let l where l.contains("lunch"):       return .orange
    case let l where l.contains("diner"):       return .indigo
    case let l where l.contains("tussendoor"):  return .green
    case let l where l.contains("snack"):       return .purple
    default:                                    return .gray
    }
  }
}

// MARK: - Preview

#Preview("Small", as: .systemSmall) {
  TodayMealsWidget()
} timeline: {
  NextMealTimelineEntry(
    date: Date(), mealLabel: "Diner", recipeName: "Pasta Bolognese",
    kcal: 650, scheduledTime: "17:30", icon: "moon.stars.fill",
    accentColor: .indigo, allMeals: [], isEmpty: false
  )
}

#Preview("Medium", as: .systemMedium) {
  TodayMealsWidget()
} timeline: {
  NextMealTimelineEntry(
    date: Date(), mealLabel: "Diner", recipeName: "Pasta Bolognese",
    kcal: 650, scheduledTime: "17:30", icon: "moon.stars.fill",
    accentColor: .indigo,
    allMeals: [
      WidgetMealEntry(mealId: "1", mealLabel: "Ontbijt", recipeName: "Havermout", imageUrl: nil, kcal: 350, scheduledHour: 7, scheduledMinute: 0),
      WidgetMealEntry(mealId: "2", mealLabel: "Lunch", recipeName: "Caesar Salade", imageUrl: nil, kcal: 500, scheduledHour: 12, scheduledMinute: 0),
      WidgetMealEntry(mealId: "3", mealLabel: "Diner", recipeName: "Pasta Bolognese", imageUrl: nil, kcal: 650, scheduledHour: 17, scheduledMinute: 30),
    ],
    isEmpty: false
  )
}
