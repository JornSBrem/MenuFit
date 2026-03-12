import Foundation
import SwiftUI

struct WeekScreen: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel
  @State private var selectedMeal: GoldWeekMealView?
  @State private var showGrocerySheet = false
  @State private var showEetmeterSheet = false

  var body: some View {
    NavigationView {
      ScrollView {
        VStack(alignment: .leading, spacing: 0) {

          WeekNavBar()

          // ── Titel + snelknoppen ──────────────────────────────
          HStack(alignment: .center, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
              Text("Week \(viewModel.selection.week)")
                .font(.title2.bold())
              statusLine
            }
            Spacer()
            statusIndicator
          }
          .padding(.horizontal, 20)
          .padding(.top, 14)

          // ── Snelknoppen ──────────────────────────────────────
          HStack(spacing: 8) {
            Button {
              viewModel.goToCurrentWeek()
            } label: {
              Label("Deze week", systemImage: "clock.arrow.circlepath")
                .font(.subheadline.weight(.medium))
            }
            .buttonStyle(.bordered)
            .tint(MFColors.accent)
            .disabled(viewModel.isCurrentWeekSelected && !viewModel.isLoading)

            Button {
              viewModel.goToToday()
            } label: {
              Label("Vandaag", systemImage: "sun.max.fill")
                .font(.subheadline.weight(.medium))
            }
            .buttonStyle(.bordered)

            Spacer()

            Button { showGrocerySheet = true } label: {
              Image(systemName: "basket.fill")
                .font(.title3)
            }
            .buttonStyle(.bordered)
            .tint(.green)
            .disabled(viewModel.groceries == nil)

            Button {
              showEetmeterSheet = true
              Task { await viewModel.loadEetmeterDag() }
            } label: {
              Image(systemName: "fork.knife")
                .font(.title3)
            }
            .buttonStyle(.bordered)
            .tint(.orange)
          }
          .padding(.horizontal, 20)
          .padding(.top, 10)

          if let err = viewModel.lastError {
            Text(err)
              .font(.caption).foregroundColor(MFColors.error)
              .padding(.horizontal, 20).padding(.top, 4)
          }

          // ── Komende dagen (horizontale kaarten) ──────────────
          if !upcomingRecipeMeals.isEmpty {
            MFSectionHeader(title: "Komende dagen", icon: "sparkles")

            ScrollView(.horizontal, showsIndicators: false) {
              HStack(alignment: .top, spacing: 12) {
                ForEach(upcomingRecipeMeals) { meal in
                  upcomingCard(meal)
                }
              }
              .padding(.horizontal, 20)
              .padding(.vertical, 6)
            }
          }

          // ── Dagtabs ──────────────────────────────────────────
          if !viewModel.availableDayLabels.isEmpty {
            dayTabsBar
              .padding(.top, 16)

            dayMealsSection
              .padding(.horizontal, 16)
              .padding(.top, 8)
          }

          Spacer(minLength: 32)
        }
      }
      .background(Color(.systemGroupedBackground))
      .navigationTitle(AppStrings.text(.weekNavigationTitle))
      .navigationBarTitleDisplayMode(.inline)
      .sheet(item: $selectedMeal) { meal in
        RecipeDetailSheet(meal: meal)
          .environmentObject(viewModel)
      }
      .sheet(isPresented: $showGrocerySheet) {
        GroceryListSheet()
          .environmentObject(viewModel)
      }
      .sheet(isPresented: $showEetmeterSheet) {
        EetmeterDagSheet()
          .environmentObject(viewModel)
      }
    }
  }

  // MARK: Status line

  @ViewBuilder
  private var statusLine: some View {
    if viewModel.isLoading {
      HStack(spacing: 4) {
        ProgressView().scaleEffect(0.6)
        Text("Laden...")
          .font(.caption).foregroundColor(.secondary)
      }
    } else if let summary = viewModel.summary, !viewModel.isUsingOfflineCache {
      Text("\(summary.weekPlan.mealCount) maaltijden \u{00B7} \(summary.weekPlan.kcal) kcal")
        .font(.caption).foregroundColor(.secondary)
    } else if viewModel.isUsingOfflineCache {
      Label("Offline modus", systemImage: "icloud.slash")
        .font(.caption).foregroundColor(.orange)
    } else {
      Text("Geen weekdata geladen")
        .font(.caption).foregroundColor(.secondary)
    }
  }

  // MARK: Status indicator

  @ViewBuilder
  private var statusIndicator: some View {
    if viewModel.isLoading {
      ProgressView()
    } else if viewModel.isUsingOfflineCache {
      Image(systemName: "icloud.slash")
        .foregroundColor(.orange)
        .font(.title3)
    } else if viewModel.summary != nil {
      Image(systemName: "checkmark.circle.fill")
        .foregroundColor(MFColors.success)
        .font(.title3)
    }
  }

  // MARK: Komende recepten

  private var upcomingRecipeMeals: [GoldWeekMealView] {
    viewModel.upcomingDayCards
      .flatMap { $0.meals }
      .filter { $0.recipeId != nil && $0.imageUrl != nil }
  }

  private func upcomingCard(_ meal: GoldWeekMealView) -> some View {
    Button { selectedMeal = meal } label: {
      VStack(alignment: .leading, spacing: 8) {
        MFAsyncImage(urlString: meal.imageUrl, width: 150, height: 100, cornerRadius: 14)

        VStack(alignment: .leading, spacing: 3) {
          if let recipeName = meal.recipeName, !recipeName.isEmpty {
            Text(recipeName)
              .font(.subheadline.bold())
              .foregroundColor(.primary)
              .lineLimit(2)
              .multilineTextAlignment(.leading)
          }
          HStack(spacing: 4) {
            Text(meal.dayLabel.capitalized)
              .font(.caption2)
              .foregroundColor(.secondary)
            if let kcal = meal.kcal {
              Text("\u{00B7}")
                .font(.caption2).foregroundColor(.secondary)
              Text("\(kcal) kcal")
                .font(.caption2.bold())
                .foregroundColor(MFColors.accent)
            }
          }
        }
      }
      .frame(width: 150)
    }
    .buttonStyle(.plain)
  }

  // MARK: Day tabs

  private var dayTabsBar: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 8) {
        ForEach(viewModel.availableDayLabels, id: \.self) { day in
          let selected = viewModel.selectedDayLabel == day
          Button {
            withAnimation(.snappy) { viewModel.selectDay(day) }
          } label: {
            Text(day.capitalized)
              .font(.subheadline.weight(selected ? .bold : .medium))
              .padding(.horizontal, 14)
              .padding(.vertical, 8)
              .background(
                Capsule()
                  .fill(selected ? MFColors.accent : Color(.secondarySystemBackground))
              )
              .foregroundColor(selected ? .white : .primary)
          }
          .buttonStyle(.plain)
        }
      }
      .padding(.horizontal, 20)
    }
  }

  // MARK: Maaltijden geselecteerde dag

  @ViewBuilder
  private var dayMealsSection: some View {
    if viewModel.selectedDayMeals.isEmpty {
      MFEmptyState(
        icon: "fork.knife.circle",
        title: "Geen menu-items",
        subtitle: "Er zijn geen maaltijden gepland voor \(viewModel.selectedDayLabel.capitalized)."
      )
    } else {
      ForEach(viewModel.selectedDayMeals) { meal in
        Button { selectedMeal = meal } label: {
          mealRow(meal)
        }
        .buttonStyle(.plain)
      }
    }
  }

  private func mealRow(_ meal: GoldWeekMealView) -> some View {
    HStack(spacing: 12) {
      MFMealIcon(mealLabel: meal.mealLabel, size: 44)

      VStack(alignment: .leading, spacing: 3) {
        Text(meal.mealLabel)
          .font(.subheadline.weight(.semibold))
        if let recipeName = meal.recipeName, !recipeName.isEmpty {
          Text(recipeName)
            .font(.caption)
            .foregroundColor(.secondary)
            .lineLimit(1)
        }
      }

      Spacer()

      if let kcal = meal.kcal {
        MFKcalBadge(kcal: kcal)
      }

      Image(systemName: "chevron.right")
        .font(.caption).foregroundColor(Color(.tertiaryLabel))
    }
    .mfCard(padding: 14, cornerRadius: 14)
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

  private var resolvedIngredients: [GoldMealIngredient] {
    if let ing = meal.ingredients, !ing.isEmpty { return ing }
    if let rid = meal.recipeId, let recipe = viewModel.findRecipe(byId: rid) {
      return recipe.ingredients ?? []
    }
    return []
  }

  private var resolvedSteps: [GoldRecipeStep] {
    if let st = meal.steps, !st.isEmpty { return st }
    if let rid = meal.recipeId, let recipe = viewModel.findRecipe(byId: rid) {
      return recipe.steps ?? []
    }
    return []
  }

  private var resolvedIntro: String? {
    if let intro = meal.intro, !intro.isEmpty { return intro }
    if let rid = meal.recipeId, let recipe = viewModel.findRecipe(byId: rid) {
      return recipe.intro
    }
    return nil
  }

  private var resolvedTips: [GoldRecipeTip] {
    if let tips = meal.tips, !tips.isEmpty { return tips }
    if let rid = meal.recipeId, let recipe = viewModel.findRecipe(byId: rid) {
      return recipe.tips ?? []
    }
    return []
  }

  private var resolvedNutrition: [GoldRecipeNutrition] {
    if let nutrition = meal.nutrition, !nutrition.isEmpty { return nutrition }
    if let rid = meal.recipeId, let recipe = viewModel.findRecipe(byId: rid) {
      return recipe.nutrition ?? []
    }
    return []
  }

  private var resolvedLinkedDayMenus: [GoldLinkedDayMenuView] {
    if let linked = meal.linkedDayMenus, !linked.isEmpty { return linked }
    if let rid = meal.recipeId, let recipe = viewModel.findRecipe(byId: rid) {
      return recipe.linkedDayMenus ?? []
    }
    return []
  }

  private var resolvedPrepTimes: [GoldRecipePreparationTime] {
    if let prepTimes = meal.prepTimes, !prepTimes.isEmpty { return prepTimes }
    if let rid = meal.recipeId, let recipe = viewModel.findRecipe(byId: rid) {
      return recipe.prepTimes ?? []
    }
    return []
  }

  private var resolvedIngredientsRelatesTo: String? {
    if let value = meal.ingredientsRelatesTo, !value.isEmpty { return value }
    if let rid = meal.recipeId, let recipe = viewModel.findRecipe(byId: rid) {
      return recipe.ingredientsRelatesTo
    }
    return nil
  }

  private var resolvedNutrientsRelatesTo: String? {
    if let value = meal.nutrientsRelatesTo, !value.isEmpty { return value }
    if let rid = meal.recipeId, let recipe = viewModel.findRecipe(byId: rid) {
      return recipe.nutrientsRelatesTo
    }
    return nil
  }

  var body: some View {
    NavigationView {
      ScrollView {
        VStack(alignment: .leading, spacing: 0) {

          // ── Hero image ───────────────────────────────────────
          MFAsyncImage(urlString: meal.imageUrl, width: .infinity, height: 260, cornerRadius: 0)
            .overlay(alignment: .bottomLeading) {
              LinearGradient(colors: [.black.opacity(0.6), .clear], startPoint: .bottom, endPoint: .center)
            }
            .overlay(alignment: .bottomLeading) {
              VStack(alignment: .leading, spacing: 4) {
                Text(displayName)
                  .font(.title2.bold())
                  .foregroundColor(.white)
                HStack(spacing: 8) {
                  if !meal.dayLabel.isEmpty {
                    Label(meal.dayLabel.capitalized, systemImage: "calendar")
                      .font(.caption.weight(.medium))
                      .foregroundColor(.white.opacity(0.9))
                  }
                  MFMealIcon(mealLabel: meal.mealLabel, size: 24)
                  if let kcal = meal.kcal {
                    MFKcalBadge(kcal: kcal)
                  }
                }
              }
              .padding(20)
            }

          VStack(alignment: .leading, spacing: 20) {
            if let intro = resolvedIntro, !intro.isEmpty {
              VStack(alignment: .leading, spacing: 10) {
                MFSectionHeader(title: "Over dit recept", icon: "text.alignleft")
                Text(intro)
                  .font(.subheadline)
                  .fixedSize(horizontal: false, vertical: true)
                  .mfCard()
              }
            }

            if !resolvedNutrition.isEmpty {
              VStack(alignment: .leading, spacing: 10) {
                MFSectionHeader(title: "Voedingswaarden", icon: "chart.bar")

                if let nutrientsRelatesTo = resolvedNutrientsRelatesTo, !nutrientsRelatesTo.isEmpty {
                  Text(nutrientsRelatesTo.capitalized)
                    .font(.caption)
                    .foregroundColor(.secondary)
                }

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 120), spacing: 10)], spacing: 10) {
                  ForEach(resolvedNutrition) { nutrient in
                    VStack(alignment: .leading, spacing: 4) {
                      Text(nutrient.label)
                        .font(.caption)
                        .foregroundColor(.secondary)
                      Text(nutrientValue(nutrient))
                        .font(.headline.weight(.semibold))
                        .foregroundColor(.primary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .mfCard(padding: 12, cornerRadius: 12)
                  }
                }
              }
            }

            if !resolvedPrepTimes.isEmpty {
              VStack(alignment: .leading, spacing: 10) {
                MFSectionHeader(title: "Bereidingstijd", icon: "timer")
                HStack(spacing: 8) {
                  ForEach(resolvedPrepTimes) { prep in
                    Text(prep.label)
                      .font(.subheadline.weight(.medium))
                      .padding(.horizontal, 10)
                      .padding(.vertical, 8)
                      .background(Capsule().fill(Color(.secondarySystemBackground)))
                  }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
              }
            }

            // ── Ingrediënten ─────────────────────────────────
            if !resolvedIngredients.isEmpty {
              VStack(alignment: .leading, spacing: 10) {
                MFSectionHeader(title: "Ingrediënten", icon: "list.bullet")

                if let ingredientsRelatesTo = resolvedIngredientsRelatesTo, !ingredientsRelatesTo.isEmpty {
                  Text(ingredientsRelatesTo.capitalized)
                    .font(.caption)
                    .foregroundColor(.secondary)
                }

                VStack(alignment: .leading, spacing: 6) {
                  ForEach(resolvedIngredients, id: \.text) { ing in
                    HStack(alignment: .top, spacing: 10) {
                      Circle()
                        .fill(MFColors.accent.opacity(0.3))
                        .frame(width: 6, height: 6)
                        .padding(.top, 6)
                      Text(ing.text)
                        .font(.subheadline)
                    }
                  }
                }
                .mfCard()
              }
            } else {
              VStack(alignment: .leading, spacing: 8) {
                MFSectionHeader(title: "Ingrediënten", icon: "list.bullet")
                Text("Niet beschikbaar")
                  .font(.subheadline).foregroundColor(.secondary).italic()
                  .mfCard()
              }
            }

            // ── Bereiding ────────────────────────────────────
            if !resolvedSteps.isEmpty {
              VStack(alignment: .leading, spacing: 10) {
                MFSectionHeader(title: "Bereiding", icon: "flame")

                VStack(alignment: .leading, spacing: 14) {
                  ForEach(resolvedSteps, id: \.step) { step in
                    HStack(alignment: .top, spacing: 12) {
                      Text("\(step.step)")
                        .font(.caption.bold())
                        .foregroundColor(.white)
                        .frame(width: 26, height: 26)
                        .background(MFColors.accent)
                        .clipShape(Circle())
                      Text(step.text)
                        .font(.subheadline)
                        .fixedSize(horizontal: false, vertical: true)
                    }
                  }
                }
                .mfCard()
              }
            } else {
              VStack(alignment: .leading, spacing: 8) {
                MFSectionHeader(title: "Bereiding", icon: "flame")
                Text("Niet beschikbaar")
                  .font(.subheadline).foregroundColor(.secondary).italic()
                .mfCard()
              }
            }

            if !resolvedTips.isEmpty {
              VStack(alignment: .leading, spacing: 10) {
                MFSectionHeader(title: "Tips", icon: "lightbulb")

                VStack(alignment: .leading, spacing: 10) {
                  ForEach(resolvedTips) { tip in
                    HStack(alignment: .top, spacing: 10) {
                      Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(MFColors.accent)
                        .padding(.top, 1)
                      Text(tip.text)
                        .font(.subheadline)
                        .fixedSize(horizontal: false, vertical: true)
                    }
                  }
                }
                .mfCard()
              }
            }

            if !resolvedLinkedDayMenus.isEmpty {
              VStack(alignment: .leading, spacing: 10) {
                MFSectionHeader(title: "Dagmenu's bij dit recept", icon: "calendar")

                VStack(alignment: .leading, spacing: 10) {
                  ForEach(resolvedLinkedDayMenus) { dayMenu in
                    VStack(alignment: .leading, spacing: 4) {
                      Text(dayMenu.title)
                        .font(.subheadline.weight(.semibold))
                      if !dayMenu.kcalVariants.isEmpty {
                        Text(dayMenu.kcalVariants.map { "\($0) kcal" }.joined(separator: " · "))
                          .font(.caption)
                          .foregroundColor(.secondary)
                      }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .mfCard(padding: 12, cornerRadius: 12)
                  }
                }
              }
            }
          }
          .padding(.top, 20)

          Spacer(minLength: 40)
        }
      }
      .background(Color(.systemGroupedBackground))
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .navigationBarLeading) {
          if let recipeId = meal.recipeId {
            let isFav = viewModel.isFavorite(recipeId)
            Button { viewModel.toggleFavorite(recipeId) } label: {
              Image(systemName: isFav ? "heart.fill" : "heart")
                .foregroundColor(isFav ? .red : .secondary)
                .font(.title3)
            }
          }
        }
        ToolbarItem(placement: .navigationBarTrailing) {
          Button { dismiss() } label: {
            Image(systemName: "xmark.circle.fill")
              .foregroundColor(.secondary)
              .font(.title3)
          }
        }
      }
    }
  }

  private func nutrientValue(_ nutrient: GoldRecipeNutrition) -> String {
    guard let amount = nutrient.amount else {
      return nutrient.unit ?? "-"
    }
    let whole = amount.rounded(.towardZero)
    let display =
      abs(amount - whole) < 0.001
      ? String(Int(whole))
      : String(format: "%.1f", amount)
    if let unit = nutrient.unit, !unit.isEmpty {
      return "\(display) \(unit)"
    }
    return display
  }
}

// MARK: - GroceryListSheet

struct GroceryListSheet: View {
  @EnvironmentObject var viewModel: UserFlowViewModel
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationView {
      ScrollView {
        VStack(alignment: .leading, spacing: 0) {

          // ── Voortgang header ──────────────────────────────
          let progress = viewModel.groceryProgress
          VStack(spacing: 10) {
            HStack {
              VStack(alignment: .leading, spacing: 2) {
                Text("Boodschappen")
                  .font(.title2.bold())
                Text("\(progress.done) van \(progress.total) afgevinkt")
                  .font(.subheadline).foregroundColor(.secondary)
              }
              Spacer()
              if progress.total > 0 {
                Text("\(Int(Double(progress.done) / Double(progress.total) * 100))%")
                  .font(.title3.bold().monospacedDigit())
                  .foregroundColor(MFColors.success)
              }
            }

            if progress.total > 0 {
              ProgressView(value: Double(progress.done), total: Double(progress.total))
                .tint(MFColors.success)
            }
          }
          .padding(20)
          .background(
            RoundedRectangle(cornerRadius: 16)
              .fill(Color(.secondarySystemGroupedBackground))
          )
          .padding(.horizontal, 16)
          .padding(.top, 16)

          // ── Items per categorie ────────────────────────────
          let groups = viewModel.groceryGroups
          if groups.isEmpty {
            MFEmptyState(
              icon: "cart",
              title: "Geen boodschappen",
              subtitle: "Er zijn geen boodschappen voor deze week."
            )
            .padding(.top, 40)
          } else {
            ForEach(groups.keys.sorted(), id: \.self) { category in
              let items = groups[category] ?? []
              VStack(alignment: .leading, spacing: 0) {
                MFSectionHeader(title: category, icon: "tag")

                VStack(spacing: 2) {
                  ForEach(items) { item in
                    let checked = viewModel.isGroceryChecked(item.canonicalName)
                    Button { viewModel.toggleGroceryChecked(item.canonicalName) } label: {
                      HStack(spacing: 12) {
                        Image(systemName: checked ? "checkmark.circle.fill" : "circle")
                          .foregroundColor(checked ? MFColors.success : Color(.tertiaryLabel))
                          .font(.title3)
                          .contentTransition(.symbolEffect(.replace))
                        VStack(alignment: .leading, spacing: 2) {
                          Text(item.canonicalName)
                            .strikethrough(checked)
                            .foregroundColor(checked ? .secondary : .primary)
                            .font(.subheadline)
                          if let amount = item.totalAmount {
                            Text("\(String(format: "%.2f", amount)) \(item.unit ?? "")")
                              .font(.caption)
                              .foregroundColor(.secondary)
                          }
                        }
                        Spacer()
                      }
                      .padding(.vertical, 10)
                      .padding(.horizontal, 16)
                    }
                    .buttonStyle(.plain)
                  }
                }
                .background(
                  RoundedRectangle(cornerRadius: 16)
                    .fill(Color(.secondarySystemGroupedBackground))
                )
                .padding(.horizontal, 16)
              }
            }
          }

          Spacer(minLength: 32)
        }
      }
      .background(Color(.systemGroupedBackground))
      .navigationTitle("Boodschappenlijst")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .navigationBarTrailing) {
          Button { dismiss() } label: {
            Image(systemName: "xmark.circle.fill")
              .foregroundColor(.secondary)
              .font(.title3)
          }
        }
      }
    }
  }
}
