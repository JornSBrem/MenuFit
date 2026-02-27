import SwiftUI

struct WeekScreen: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel
  @State private var selectedMeal: GoldWeekMealView?

  var body: some View {
    NavigationView {
      ScrollView {
        VStack(alignment: .leading, spacing: 0) {

          WeekNavBar()

          // ── Titel + snelknoppen ──────────────────────────────
          HStack(spacing: 8) {
            Text("Week \(viewModel.selection.week) (\(viewModel.selection.year))")
              .font(.headline)
            Spacer()
            statusIndicator
          }
          .padding(.horizontal, 20)
          .padding(.top, 10)

          HStack(spacing: 8) {
            Button("Deze week") { viewModel.goToCurrentWeek() }
              .buttonStyle(.bordered)
              .disabled(viewModel.isCurrentWeekSelected && !viewModel.isLoading)
            Button("Vandaag") { viewModel.goToToday() }
              .buttonStyle(.bordered)
            Spacer()
          }
          .padding(.horizontal, 16)
          .padding(.top, 6)

          // ── Status ───────────────────────────────────────────
          HStack(spacing: 6) {
            if viewModel.isLoading {
              ProgressView().scaleEffect(0.7)
              Text("Laden...")
                .font(.caption).foregroundColor(.secondary)
            } else if let summary = viewModel.summary, !viewModel.isUsingOfflineCache {
              Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green).font(.caption)
              Text("Weekmenu geladen · \(summary.weekPlan.kcal) kcal")
                .font(.caption).foregroundColor(.secondary)
            } else if viewModel.isUsingOfflineCache {
              Image(systemName: "icloud.slash")
                .foregroundColor(.orange).font(.caption)
              Text("Offline cache actief")
                .font(.caption).foregroundColor(.orange)
            } else {
              Image(systemName: "minus.circle")
                .foregroundColor(.gray).font(.caption)
              Text("Geen weekdata geladen")
                .font(.caption).foregroundColor(.secondary)
            }
          }
          .padding(.horizontal, 20)
          .padding(.top, 6)

          if let err = viewModel.lastError {
            Text(err)
              .font(.caption).foregroundColor(.red)
              .padding(.horizontal, 20).padding(.top, 2)
          }

          // ── Komende dagen ────────────────────────────────────
          if !viewModel.upcomingDayCards.isEmpty {
            Text("Komende dagen")
              .font(.title3.bold())
              .padding(.horizontal, 20)
              .padding(.top, 20)

            ScrollView(.horizontal, showsIndicators: false) {
              HStack(alignment: .top, spacing: 10) {
                ForEach(viewModel.upcomingDayCards) { card in
                  upcomingCard(card)
                }
              }
              .padding(.horizontal, 16)
              .padding(.vertical, 4)
            }
          }

          // ── Dagtabs ──────────────────────────────────────────
          if !viewModel.availableDayLabels.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
              HStack(spacing: 6) {
                ForEach(viewModel.availableDayLabels, id: \.self) { day in
                  let selected = viewModel.selectedDayLabel == day
                  Button(day.capitalized) { viewModel.selectDay(day) }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 7)
                    .background(selected ? Color.blue : Color(.secondarySystemBackground))
                    .foregroundColor(selected ? .white : .primary)
                    .cornerRadius(8)
                    .font(.subheadline)
                }
              }
              .padding(.horizontal, 16)
            }
            .padding(.top, 12)

            // Maaltijden geselecteerde dag
            dayMealsSection
              .padding(.horizontal, 16)
              .padding(.top, 8)
          }

          Spacer(minLength: 32)
        }
      }
      .navigationTitle(AppStrings.text(.weekNavigationTitle))
      .navigationBarTitleDisplayMode(.inline)
      .sheet(item: $selectedMeal) { meal in
        RecipeDetailSheet(meal: meal)
          .environmentObject(viewModel)
      }
    }
  }

  // MARK: Status indicator

  @ViewBuilder
  private var statusIndicator: some View {
    if viewModel.isLoading {
      ProgressView().scaleEffect(0.8)
    } else if viewModel.isUsingOfflineCache {
      Image(systemName: "icloud.slash").foregroundColor(.orange)
    } else if viewModel.summary != nil {
      Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
    }
  }

  // MARK: Komende dag kaart

  private func upcomingCard(_ card: DayCard) -> some View {
    Button {
      if let meal = card.firstMeal {
        selectedMeal = meal
      }
    } label: {
      VStack(alignment: .leading, spacing: 5) {
        ZStack {
          RoundedRectangle(cornerRadius: 10)
            .fill(Color(.systemGray6))
            .frame(width: 120, height: 80)
          VStack(spacing: 4) {
            Image(systemName: "fork.knife")
              .font(.title2).foregroundColor(.orange)
            if let meal = card.firstMeal {
              Text(meal.mealLabel)
                .font(.caption2).foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .padding(.horizontal, 6)
            } else {
              Text("Geen menu")
                .font(.caption2).foregroundColor(.secondary)
            }
          }
        }
        Text(card.dayLabel.capitalized)
          .font(.caption.bold()).foregroundColor(.primary)
        Text(card.mealCount == 1 ? "1 recept" : "\(card.mealCount) recepten")
          .font(.caption2).foregroundColor(.blue)
      }
      .frame(width: 120)
    }
    .buttonStyle(.plain)
  }

  // MARK: Maaltijden

  @ViewBuilder
  private var dayMealsSection: some View {
    if viewModel.selectedDayMeals.isEmpty {
      Text("Geen menu-items voor \(viewModel.selectedDayLabel.capitalized).")
        .foregroundColor(.secondary).font(.subheadline)
    } else {
      ForEach(viewModel.selectedDayMeals) { meal in
        Button { selectedMeal = meal } label: {
          HStack(spacing: 12) {
            Circle()
              .fill(Color.orange.opacity(0.15))
              .frame(width: 36, height: 36)
              .overlay {
                Image(systemName: "fork.knife")
                  .foregroundColor(.orange).font(.caption)
              }
            VStack(alignment: .leading, spacing: 2) {
              Text(meal.mealLabel).fontWeight(.medium)
              if let recipeId = meal.recipeId, !recipeId.isEmpty {
                Text(recipeId).font(.caption).foregroundColor(.secondary)
              }
            }
            Spacer()
            Image(systemName: "chevron.right")
              .font(.caption).foregroundColor(.secondary)
          }
          .padding(10)
          .background(Color(.secondarySystemBackground))
          .cornerRadius(10)
        }
        .buttonStyle(.plain)
      }
    }
  }
}

// MARK: - RecipeDetailSheet

struct RecipeDetailSheet: View {
  let meal: GoldWeekMealView
  @EnvironmentObject var viewModel: UserFlowViewModel
  @Environment(\.dismiss) private var dismiss

  private var recipeName: String {
    if let recipeId = meal.recipeId, !recipeId.isEmpty {
      return viewModel.recipes.first(where: { $0.recipeId == recipeId })?.name ?? recipeId
    }
    return meal.mealLabel
  }

  var body: some View {
    NavigationView {
      ScrollView {
        VStack(alignment: .leading, spacing: 20) {

          // Placeholder afbeelding
          RoundedRectangle(cornerRadius: 16)
            .fill(Color(.systemGray6))
            .frame(maxWidth: .infinity)
            .frame(height: 200)
            .overlay {
              Image(systemName: "fork.knife")
                .font(.system(size: 54))
                .foregroundColor(.secondary)
            }
            .padding(.horizontal, 20)

          VStack(alignment: .leading, spacing: 10) {
            Text(recipeName)
              .font(.title2.bold())

            HStack(spacing: 16) {
              Label(meal.dayLabel.capitalized, systemImage: "calendar")
                .font(.subheadline)
                .foregroundColor(.secondary)
              Label(meal.mealLabel.capitalized, systemImage: "clock")
                .font(.subheadline)
                .foregroundColor(.secondary)
            }

            if let recipeId = meal.recipeId, !recipeId.isEmpty {
              Text(recipeId)
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color(.systemGray6))
                .cornerRadius(6)
            }
          }
          .padding(.horizontal, 20)

          Spacer(minLength: 40)
        }
        .padding(.top, 20)
      }
      .navigationTitle("Recept")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .navigationBarTrailing) {
          Button("Sluiten") { dismiss() }
        }
      }
    }
  }
}
