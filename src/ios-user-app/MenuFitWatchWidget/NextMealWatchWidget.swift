import WidgetKit
import SwiftUI

// MARK: - Watch Timeline Entry

struct WatchMealTimelineEntry: TimelineEntry {
  let date: Date
  let mealLabel: String
  let recipeName: String?
  let kcal: Int?
  let scheduledTime: String?
  let icon: String
  let accentColor: Color
  let isEmpty: Bool
}

// MARK: - Watch Timeline Provider

struct WatchMealTimelineProvider: TimelineProvider {
  func placeholder(in context: Context) -> WatchMealTimelineEntry {
    WatchMealTimelineEntry(
      date: Date(),
      mealLabel: "Diner",
      recipeName: "Pasta Bolognese",
      kcal: 650,
      scheduledTime: "17:30",
      icon: "moon.stars.fill",
      accentColor: .indigo,
      isEmpty: false
    )
  }

  func getSnapshot(in context: Context, completion: @escaping (WatchMealTimelineEntry) -> Void) {
    completion(buildEntry(for: Date()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<WatchMealTimelineEntry>) -> Void) {
    let now = Date()
    let schedule = WidgetDataReader.readMealSchedule()
    var entries: [WatchMealTimelineEntry] = []

    let sortedMoments = schedule.moments.sorted { ($0.hour * 60 + $0.minute) < ($1.hour * 60 + $1.minute) }

    for (index, moment) in sortedMoments.enumerated() {
      let entryDate = moment.scheduledDateToday()
      let activationDate: Date
      if index == 0 {
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

    if entries.isEmpty {
      entries.append(buildEntry(for: now))
    }

    var tomorrow = Calendar.current.dateComponents([.year, .month, .day], from: now)
    tomorrow.day! += 1
    tomorrow.hour = 0
    tomorrow.minute = 0
    let refreshDate = Calendar.current.date(from: tomorrow) ?? now.addingTimeInterval(3600)

    completion(Timeline(entries: entries, policy: .after(refreshDate)))
  }

  private func buildEntry(for date: Date, targetMoment: MealMoment? = nil) -> WatchMealTimelineEntry {
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
      return WatchMealTimelineEntry(
        date: date, mealLabel: "MenuFit", recipeName: nil, kcal: nil,
        scheduledTime: nil, icon: "fork.knife", accentColor: .orange, isEmpty: true
      )
    }

    let matchingMeal = allMeals.first { entry in
      let entryNorm = entry.mealLabel.lowercased()
      let momentNorm = m.label.lowercased()
      return entryNorm.contains(momentNorm) || momentNorm.contains(entryNorm)
    }

    return WatchMealTimelineEntry(
      date: date,
      mealLabel: m.label,
      recipeName: matchingMeal?.recipeName,
      kcal: matchingMeal?.kcal,
      scheduledTime: m.timeString,
      icon: mealIcon(m.label),
      accentColor: mealColor(m.label),
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

// MARK: - Watch Widget Definition

struct NextMealWatchWidget: Widget {
  let kind = "nl.menufit.watch-widget.next-meal"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: WatchMealTimelineProvider()) { entry in
      WatchMealWidgetView(entry: entry)
        .containerBackground(.fill.tertiary, for: .widget)
    }
    .configurationDisplayName("Volgend eetmoment")
    .description("Toont je volgende maaltijd op je Apple Watch.")
    #if os(watchOS)
    .supportedFamilies([
      .accessoryCircular,
      .accessoryRectangular,
      .accessoryInline,
      .accessoryCorner,
    ])
    #endif
  }
}

// MARK: - Watch Widget Views

struct WatchMealWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: WatchMealTimelineEntry

  var body: some View {
    switch family {
    case .accessoryCircular:
      circularView
    case .accessoryRectangular:
      rectangularView
    case .accessoryInline:
      inlineView
    case .accessoryCorner:
      cornerView
    default:
      circularView
    }
  }

  // MARK: Circular — Icon + time

  private var circularView: some View {
    VStack(spacing: 2) {
      Image(systemName: entry.icon)
        .font(.title3)
        .foregroundStyle(entry.accentColor)
      if let time = entry.scheduledTime {
        Text(time)
          .font(.caption2.bold().monospacedDigit())
          .minimumScaleFactor(0.7)
      }
    }
    .widgetAccentable()
  }

  // MARK: Rectangular — Meal name + recipe + time

  private var rectangularView: some View {
    HStack(spacing: 6) {
      Image(systemName: entry.icon)
        .font(.title3)
        .foregroundStyle(entry.accentColor)
        .frame(width: 24)

      VStack(alignment: .leading, spacing: 2) {
        HStack(spacing: 4) {
          Text(entry.mealLabel)
            .font(.caption.bold())
            .lineLimit(1)
          if let time = entry.scheduledTime {
            Text(time)
              .font(.caption2.monospacedDigit())
              .foregroundStyle(.secondary)
          }
        }

        if let recipe = entry.recipeName {
          Text(recipe)
            .font(.caption2)
            .lineLimit(1)
        }

        if let kcal = entry.kcal {
          HStack(spacing: 2) {
            Image(systemName: "flame.fill")
              .font(.system(size: 8))
              .foregroundStyle(.orange)
            Text("\(kcal) kcal")
              .font(.system(size: 10, weight: .medium).monospacedDigit())
              .foregroundStyle(.orange)
          }
        }
      }
    }
    .widgetAccentable()
  }

  // MARK: Inline — Single line

  private var inlineView: some View {
    let recipe = entry.recipeName ?? entry.mealLabel
    let time = entry.scheduledTime ?? ""
    return Text("\(time) \(recipe)")
  }

  // MARK: Corner — Icon + label

  private var cornerView: some View {
    Image(systemName: entry.icon)
      .font(.title3)
      .foregroundStyle(entry.accentColor)
      .widgetAccentable()
      .widgetLabel {
        Text(entry.recipeName ?? entry.mealLabel)
      }
  }
}

// MARK: - Previews

#Preview("Circular", as: .accessoryCircular) {
  NextMealWatchWidget()
} timeline: {
  WatchMealTimelineEntry(
    date: Date(), mealLabel: "Diner", recipeName: "Pasta",
    kcal: 650, scheduledTime: "17:30", icon: "moon.stars.fill",
    accentColor: .indigo, isEmpty: false
  )
}

#Preview("Rectangular", as: .accessoryRectangular) {
  NextMealWatchWidget()
} timeline: {
  WatchMealTimelineEntry(
    date: Date(), mealLabel: "Diner", recipeName: "Pasta Bolognese",
    kcal: 650, scheduledTime: "17:30", icon: "moon.stars.fill",
    accentColor: .indigo, isEmpty: false
  )
}
