import SwiftUI

// MARK: - Watch Home View

/// Hoofdscherm van de Apple Watch app.
/// Toont het volgende eetmoment en een overzicht van de dag.
struct WatchHomeView: View {
  @State private var todayData: WidgetDayData?
  @State private var schedule = MealSchedule.default
  @State private var now = Date()

  private let timer = Timer.publish(every: 60, on: .main, in: .common).autoconnect()

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: 12) {
          nextMealCard
          Divider().padding(.horizontal)
          dayOverviewSection
        }
        .padding(.vertical, 4)
      }
      .navigationTitle("MenuFit")
      .onAppear { refreshData() }
      .onReceive(timer) { _ in
        now = Date()
        refreshData()
      }
    }
  }

  // MARK: - Next Meal Card

  @ViewBuilder
  private var nextMealCard: some View {
    let nextMoment = schedule.nextMoment(after: now)
    let currentMoment = schedule.currentMoment(at: now)
    let activeMoment = nextMoment ?? currentMoment

    if let moment = activeMoment {
      let meal = matchingMeal(for: moment)
      let isNext = nextMoment != nil

      VStack(spacing: 8) {
        // Header
        HStack(spacing: 6) {
          Image(systemName: mealIcon(moment.label))
            .font(.title3)
            .foregroundStyle(mealColor(moment.label))
          VStack(alignment: .leading, spacing: 1) {
            Text(isNext ? "Volgende" : "Nu")
              .font(.caption2)
              .foregroundStyle(.secondary)
            Text(moment.label)
              .font(.headline)
              .lineLimit(1)
          }
          Spacer()
          Text(moment.timeString)
            .font(.caption.bold().monospacedDigit())
            .foregroundStyle(.secondary)
        }

        // Recipe
        if let recipe = meal?.recipeName {
          HStack {
            Text(recipe)
              .font(.body.weight(.medium))
              .lineLimit(2)
              .fixedSize(horizontal: false, vertical: true)
            Spacer()
          }
        } else {
          HStack {
            Text("Geen recept gevonden")
              .font(.caption)
              .foregroundStyle(.secondary)
            Spacer()
          }
        }

        // Kcal badge
        if let kcal = meal?.kcal {
          HStack {
            HStack(spacing: 3) {
              Image(systemName: "flame.fill")
                .font(.caption2)
                .foregroundStyle(.orange)
              Text("\(kcal) kcal")
                .font(.caption.bold())
                .foregroundStyle(.orange)
            }
            Spacer()
          }
        }
      }
      .padding(10)
      .background(
        RoundedRectangle(cornerRadius: 12, style: .continuous)
          .fill(Color(.darkGray).opacity(0.3))
      )
      .padding(.horizontal, 4)
    } else {
      VStack(spacing: 6) {
        Image(systemName: "moon.zzz.fill")
          .font(.title2)
          .foregroundStyle(.secondary)
        Text("Alle maaltijden van vandaag zijn voorbij")
          .font(.caption)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
      }
      .padding()
    }
  }

  // MARK: - Day Overview

  private var dayOverviewSection: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("Dagmenu")
        .font(.caption.bold())
        .foregroundStyle(.secondary)
        .padding(.horizontal, 8)

      if let meals = todayData?.meals, !meals.isEmpty {
        ForEach(meals) { meal in
          let moment = schedule.momentForMealLabel(meal.mealLabel)
          let isActive = isCurrentMeal(moment)

          HStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 2)
              .fill(isActive ? Color.orange : mealDotColor(meal.mealLabel))
              .frame(width: 3, height: 28)

            VStack(alignment: .leading, spacing: 1) {
              HStack(spacing: 4) {
                Text(meal.mealLabel)
                  .font(.caption2.bold())
                  .foregroundStyle(isActive ? .primary : .secondary)
                if let time = meal.scheduledTimeString {
                  Text(time)
                    .font(.caption2.monospacedDigit())
                    .foregroundStyle(.secondary)
                }
              }
              if let recipe = meal.recipeName {
                Text(recipe)
                  .font(.caption)
                  .lineLimit(1)
                  .foregroundStyle(isActive ? .primary : Color(.lightGray))
              }
            }

            Spacer()

            if let kcal = meal.kcal {
              Text("\(kcal)")
                .font(.caption2.bold())
                .foregroundStyle(.orange)
            }
          }
          .padding(.horizontal, 8)
          .padding(.vertical, 2)
        }
      } else {
        VStack(spacing: 4) {
          Image(systemName: "tray")
            .foregroundStyle(.secondary)
          Text("Open MenuFit op je iPhone om je weekmenu te laden")
            .font(.caption2)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)
        }
        .padding()
      }
    }
  }

  // MARK: - Helpers

  private func refreshData() {
    todayData = WidgetDataReader.readTodayData()
    schedule = WidgetDataReader.readMealSchedule()
  }

  private func matchingMeal(for moment: MealMoment) -> WidgetMealEntry? {
    todayData?.meals.first { entry in
      let entryNorm = entry.mealLabel.lowercased()
      let momentNorm = moment.label.lowercased()
      return entryNorm.contains(momentNorm) || momentNorm.contains(entryNorm)
    }
  }

  private func isCurrentMeal(_ moment: MealMoment?) -> Bool {
    guard let m = moment else { return false }
    let next = schedule.nextMoment(after: now)
    if let n = next { return m.label == n.label }
    let current = schedule.currentMoment(at: now)
    return current?.label == m.label
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
