import SwiftUI

struct RecipesScreen: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel
  @State private var selectedMeal: GoldWeekMealView?
  @State private var showOnlyFavorites = false

  private var displayedRecipes: [UserRecipeRecord] {
    let base = viewModel.filteredRecipes
    if showOnlyFavorites {
      return base.filter { viewModel.isFavorite($0.recipeId) }
    }
    return base
  }

  var body: some View {
    NavigationView {
      ScrollView {
        VStack(alignment: .leading, spacing: 0) {

          // ── Zoekbalk ─────────────────────────────────────────
          HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
              .foregroundColor(.secondary)
              .font(.subheadline)
            TextField("Zoek recept...", text: $viewModel.recipesSearchText)
              .autocorrectionDisabled()
              .font(.subheadline)
          }
          .padding(12)
          .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
              .fill(Color(.secondarySystemGroupedBackground))
          )
          .padding(.horizontal, 16)
          .padding(.top, 12)

          // ── Filters ──────────────────────────────────────────
          HStack(spacing: 8) {
            if viewModel.isRecipesLoading {
              HStack(spacing: 4) {
                ProgressView().scaleEffect(0.6)
                Text("Laden...")
                  .font(.caption).foregroundColor(.secondary)
              }
            } else {
              Text("\(displayedRecipes.count) recept\(displayedRecipes.count == 1 ? "" : "en")")
                .font(.caption).foregroundColor(.secondary)
            }

            Spacer()

            Button {
              withAnimation(.snappy) { showOnlyFavorites.toggle() }
            } label: {
              HStack(spacing: 4) {
                Image(systemName: showOnlyFavorites ? "heart.fill" : "heart")
                Text("Favorieten")
                  .font(.caption.weight(.medium))
              }
              .foregroundColor(showOnlyFavorites ? .red : .secondary)
              .padding(.horizontal, 12)
              .padding(.vertical, 7)
              .background(
                Capsule()
                  .fill(showOnlyFavorites ? Color.red.opacity(0.12) : Color(.secondarySystemGroupedBackground))
              )
            }

            Button {
              Task { await viewModel.loadRecipes() }
            } label: {
              Image(systemName: "arrow.clockwise")
                .font(.subheadline)
                .foregroundColor(.secondary)
            }
            .disabled(viewModel.isRecipesLoading)
          }
          .padding(.horizontal, 16)
          .padding(.vertical, 10)

          // ── Inhoud ────────────────────────────────────────────
          if viewModel.isRecipesLoading && displayedRecipes.isEmpty {
            VStack(spacing: 12) {
              ForEach(0..<5, id: \.self) { _ in
                MFShimmer()
                  .frame(height: 80)
                  .padding(.horizontal, 16)
              }
            }
            .padding(.top, 8)
          } else if displayedRecipes.isEmpty {
            MFEmptyState(
              icon: showOnlyFavorites ? "heart.slash" : "fork.knife.circle",
              title: showOnlyFavorites ? "Geen favorieten" : "Geen recepten",
              subtitle: showOnlyFavorites
                ? "Tik op het hartje in een recept om favorieten toe te voegen."
                : viewModel.recipes.isEmpty
                  ? "Laad weekdata om recepten te importeren."
                  : "Geen recepten gevonden voor '\(viewModel.recipesSearchText)'."
            )
          } else {
            LazyVStack(spacing: 6) {
              ForEach(displayedRecipes) { recipe in
                Button { selectedMeal = recipe.toMealView() } label: {
                  recipeRow(recipe)
                }
                .buttonStyle(.plain)
              }
            }
            .padding(.horizontal, 16)
            .padding(.top, 4)
          }

          Spacer(minLength: 32)
        }
      }
      .background(Color(.systemGroupedBackground))
      .navigationTitle("Recepten")
      .navigationBarTitleDisplayMode(.large)
      .onAppear {
        if viewModel.recipes.isEmpty && !viewModel.isRecipesLoading {
          Task { await viewModel.loadRecipes() }
        }
      }
      .refreshable {
        await viewModel.loadRecipes()
      }
      .sheet(item: $selectedMeal) { meal in
        RecipeDetailSheet(meal: meal)
          .environmentObject(viewModel)
      }
    }
  }

  private func recipeRow(_ recipe: UserRecipeRecord) -> some View {
    HStack(spacing: 12) {
      MFAsyncImage(urlString: recipe.imageUrl, width: 64, height: 64, cornerRadius: 12)

      VStack(alignment: .leading, spacing: 4) {
        Text(recipe.name)
          .font(.subheadline.weight(.semibold))
          .foregroundColor(.primary)
          .lineLimit(2)
          .multilineTextAlignment(.leading)
        if let kcal = recipe.kcal {
          MFKcalBadge(kcal: kcal)
        }
      }

      Spacer()

      Button {
        viewModel.toggleFavorite(recipe.recipeId)
      } label: {
        Image(systemName: viewModel.isFavorite(recipe.recipeId) ? "heart.fill" : "heart")
          .foregroundColor(viewModel.isFavorite(recipe.recipeId) ? .red : Color(.tertiaryLabel))
          .font(.title3)
          .contentTransition(.symbolEffect(.replace))
      }
      .buttonStyle(.plain)
    }
    .mfCard(padding: 12, cornerRadius: 14)
  }
}
