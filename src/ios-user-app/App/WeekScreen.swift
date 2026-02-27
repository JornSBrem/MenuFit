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
          if !upcomingRecipeMeals.isEmpty {
            Text("Komende dagen")
              .font(.title3.bold())
              .padding(.horizontal, 20)
              .padding(.top, 20)

            ScrollView(.horizontal, showsIndicators: false) {
              HStack(alignment: .top, spacing: 10) {
                ForEach(upcomingRecipeMeals) { meal in
                  recipeCard(meal)
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

  // MARK: Komende recepten (alleen maaltijden met een recept)

  private var upcomingRecipeMeals: [GoldWeekMealView] {
    viewModel.upcomingDayCards
      .flatMap { $0.meals }
      .filter { $0.recipeId != nil }
  }

  private func recipeCard(_ meal: GoldWeekMealView) -> some View {
    Button { selectedMeal = meal } label: {
      VStack(alignment: .leading, spacing: 6) {
        Group {
          if let urlString = meal.imageUrl, let url = URL(string: urlString) {
            AsyncImage(url: url) { phase in
              switch phase {
              case .success(let image):
                image.resizable().scaledToFill()
              default:
                Color(.systemGray6)
                  .overlay(
                    Image(systemName: "fork.knife")
                      .font(.title2).foregroundColor(.orange)
                  )
              }
            }
          } else {
            Color(.systemGray6)
              .overlay(
                Image(systemName: "fork.knife")
                  .font(.title2).foregroundColor(.orange)
              )
          }
        }
        .frame(width: 130, height: 90)
        .clipShape(RoundedRectangle(cornerRadius: 12))

        if let recipeName = meal.recipeName, !recipeName.isEmpty {
          Text(recipeName)
            .font(.caption.bold())
            .foregroundColor(.primary)
            .lineLimit(2)
            .multilineTextAlignment(.leading)
        }
        Text("\(meal.dayLabel.capitalized) · \(meal.mealLabel)")
          .font(.caption2)
          .foregroundColor(.secondary)
          .lineLimit(1)
      }
      .frame(width: 130)
    }
    .buttonStyle(.plain)
  }

  // MARK: Maaltijden geselecteerde dag

  @ViewBuilder
  private var dayMealsSection: some View {
    if viewModel.selectedDayMeals.isEmpty {
      Text("Geen menu-items voor \(viewModel.selectedDayLabel.capitalized).")
        .foregroundColor(.secondary).font(.subheadline)
    } else {
      ForEach(viewModel.selectedDayMeals) { meal in
        Button { selectedMeal = meal } label: {
          VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
              mealMomentIcon(meal.mealLabel)

              VStack(alignment: .leading, spacing: 2) {
                Text(meal.mealLabel).fontWeight(.semibold)
                if let recipeName = meal.recipeName, !recipeName.isEmpty {
                  Text(recipeName)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
                }
              }

              Spacer()

              if let kcal = meal.kcal {
                Text("\(kcal) kcal")
                  .font(.caption.bold())
                  .foregroundColor(.orange)
                  .padding(.horizontal, 6)
                  .padding(.vertical, 3)
                  .background(Color.orange.opacity(0.12))
                  .cornerRadius(6)
              }

              Image(systemName: "chevron.right")
                .font(.caption).foregroundColor(.secondary)
            }

            // Ingrediëntenpreview
            if let ingredients = meal.ingredients, !ingredients.isEmpty {
              VStack(alignment: .leading, spacing: 2) {
                ForEach(Array(ingredients.prefix(3)), id: \.text) { ing in
                  Text("• \(ing.text)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                }
                if ingredients.count > 3 {
                  Text("+ \(ingredients.count - 3) meer…")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                }
              }
              .padding(.leading, 46)
            }
          }
          .padding(12)
          .background(Color(.secondarySystemBackground))
          .cornerRadius(12)
        }
        .buttonStyle(.plain)
      }
    }
  }

  // MARK: Maaltijdmoment icoon

  @ViewBuilder
  private func mealMomentIcon(_ label: String) -> some View {
    let (symbol, color): (String, Color) = {
      switch label {
      case "Ontbijt":               return ("sunrise.fill", .yellow)
      case "Tussendoor (ochtend)":  return ("cup.and.saucer.fill", .brown)
      case "Lunch":                 return ("sun.max.fill", .orange)
      case "Tussendoor (middag)":   return ("leaf.fill", .green)
      case "Diner":                 return ("moon.stars.fill", .indigo)
      case "Snack":                 return ("star.fill", .purple)
      default:                      return ("fork.knife", .orange)
      }
    }()
    Circle()
      .fill(color.opacity(0.15))
      .frame(width: 36, height: 36)
      .overlay {
        Image(systemName: symbol)
          .foregroundColor(color)
          .font(.caption)
      }
  }
}

// MARK: - RecipeDetailSheet

struct RecipeDetailSheet: View {
  let meal: GoldWeekMealView
  @EnvironmentObject var viewModel: UserFlowViewModel
  @Environment(\.dismiss) private var dismiss

  private var displayName: String {
    if let name = meal.recipeName, !name.isEmpty { return name }
    return meal.mealLabel
  }

  var body: some View {
    NavigationView {
      ScrollView {
        VStack(alignment: .leading, spacing: 0) {

          // ── Receptafbeelding ─────────────────────────────────
          Group {
            if let urlString = meal.imageUrl, let url = URL(string: urlString) {
              AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                  image.resizable().scaledToFill()
                case .failure:
                  imagePlaceholder
                default:
                  Color(.systemGray6)
                    .overlay(ProgressView())
                }
              }
            } else {
              imagePlaceholder
            }
          }
          .frame(maxWidth: .infinity)
          .frame(height: 240)
          .clipped()
          .cornerRadius(16)
          .padding(.horizontal, 20)
          .padding(.top, 20)

          VStack(alignment: .leading, spacing: 14) {

            // ── Naam ─────────────────────────────────────────
            Text(displayName)
              .font(.title2.bold())
              .padding(.top, 4)

            // ── Labels ───────────────────────────────────────
            HStack(spacing: 10) {
              Label(meal.dayLabel.capitalized, systemImage: "calendar")
                .font(.subheadline).foregroundColor(.secondary)
              Label(meal.mealLabel, systemImage: "clock")
                .font(.subheadline).foregroundColor(.secondary)
            }

            // ── Kcal ─────────────────────────────────────────
            if let kcal = meal.kcal {
              Label("\(kcal) kcal", systemImage: "flame.fill")
                .font(.subheadline.bold())
                .foregroundColor(.orange)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(Color.orange.opacity(0.12))
                .cornerRadius(8)
            }

            // ── Ingrediëntenlijst ─────────────────────────────
            if let ingredients = meal.ingredients, !ingredients.isEmpty {
              Divider().padding(.vertical, 4)

              Text("Ingrediënten")
                .font(.headline)

              ForEach(ingredients, id: \.text) { ing in
                HStack(alignment: .top, spacing: 8) {
                  Text("•")
                    .foregroundColor(.secondary)
                    .frame(width: 12, alignment: .center)
                  Text(ing.text)
                    .font(.subheadline)
                }
              }
            }
          }
          .padding(.horizontal, 20)
          .padding(.top, 16)

          Spacer(minLength: 40)
        }
      }
      .navigationTitle(meal.mealLabel)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .navigationBarTrailing) {
          Button("Sluiten") { dismiss() }
        }
      }
    }
  }

  private var imagePlaceholder: some View {
    Color(.systemGray6)
      .overlay(
        Image(systemName: "fork.knife")
          .font(.system(size: 54))
          .foregroundColor(.secondary)
      )
  }
}
