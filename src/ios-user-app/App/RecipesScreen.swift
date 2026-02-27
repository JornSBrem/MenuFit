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
      VStack(spacing: 0) {

        // ── Zoekbalk ─────────────────────────────────────────
        HStack(spacing: 8) {
          Image(systemName: "magnifyingglass")
            .foregroundColor(.secondary)
          TextField("Zoek recept...", text: $viewModel.recipesSearchText)
            .autocorrectionDisabled()
        }
        .padding(10)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(10)
        .padding(.horizontal, 16)
        .padding(.top, 8)

        // ── Filters + telling ─────────────────────────────────
        HStack(spacing: 8) {
          if viewModel.isRecipesLoading {
            Text("Recepten laden...")
              .font(.caption).foregroundColor(.secondary)
          } else {
            Text("\(displayedRecipes.count) recept\(displayedRecipes.count == 1 ? "" : "en")")
              .font(.caption).foregroundColor(.secondary)
          }

          Spacer()

          // Favorieten filter
          Button {
            showOnlyFavorites.toggle()
          } label: {
            HStack(spacing: 4) {
              Image(systemName: showOnlyFavorites ? "heart.fill" : "heart")
                .foregroundColor(showOnlyFavorites ? .red : .secondary)
              Text("Favorieten")
                .font(.caption)
                .foregroundColor(showOnlyFavorites ? .red : .secondary)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(showOnlyFavorites ? Color.red.opacity(0.1) : Color(.secondarySystemBackground))
            .cornerRadius(8)
          }

          Button {
            Task { await viewModel.loadRecipes() }
          } label: {
            Image(systemName: "arrow.clockwise")
              .font(.caption)
              .foregroundColor(.secondary)
          }
          .disabled(viewModel.isRecipesLoading)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 6)

        Divider()

        // ── Inhoud ────────────────────────────────────────────
        if viewModel.isRecipesLoading {
          Spacer()
          ProgressView("Recepten laden...")
          Spacer()
        } else if displayedRecipes.isEmpty {
          Spacer()
          VStack(spacing: 12) {
            Image(systemName: showOnlyFavorites ? "heart.slash" : "fork.knife.circle")
              .font(.system(size: 48))
              .foregroundColor(.secondary)
            Text(
              showOnlyFavorites
                ? "Nog geen favorieten opgeslagen.\nTik op het hartje in een recept."
                : viewModel.recipes.isEmpty
                  ? "Nog geen recepten beschikbaar.\nLaad weekdata om recepten te importeren."
                  : "Geen recepten gevonden voor '\(viewModel.recipesSearchText)'."
            )
            .foregroundColor(.secondary)
            .font(.subheadline)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 32)
          }
          Spacer()
        } else {
          List {
            ForEach(displayedRecipes) { recipe in
              Button { selectedMeal = recipe.toMealView() } label: {
                recipeRow(recipe)
              }
              .buttonStyle(.plain)
              .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                Button {
                  viewModel.toggleFavorite(recipe.recipeId)
                } label: {
                  Label(
                    viewModel.isFavorite(recipe.recipeId) ? "Verwijder" : "Favoriet",
                    systemImage: viewModel.isFavorite(recipe.recipeId) ? "heart.slash" : "heart.fill"
                  )
                }
                .tint(viewModel.isFavorite(recipe.recipeId) ? .gray : .red)
              }
            }
          }
          .listStyle(.plain)
          .refreshable {
            await viewModel.loadRecipes()
          }
        }
      }
      .navigationTitle("Recepten")
      .navigationBarTitleDisplayMode(.large)
      .onAppear {
        if viewModel.recipes.isEmpty && !viewModel.isRecipesLoading {
          Task { await viewModel.loadRecipes() }
        }
      }
      .sheet(item: $selectedMeal) { meal in
        RecipeDetailSheet(meal: meal)
          .environmentObject(viewModel)
      }
    }
  }

  @ViewBuilder
  private func recipeRow(_ recipe: UserRecipeRecord) -> some View {
    HStack(spacing: 12) {
      // Receptafbeelding
      Group {
        if let urlString = recipe.imageUrl, let url = URL(string: urlString) {
          AsyncImage(url: url) { phase in
            switch phase {
            case .success(let image):
              image.resizable().scaledToFill()
            default:
              Color(.systemGray5)
                .overlay(Image(systemName: "fork.knife").foregroundColor(.gray))
            }
          }
        } else {
          Color(.systemGray5)
            .overlay(Image(systemName: "fork.knife").foregroundColor(.gray))
        }
      }
      .frame(width: 56, height: 56)
      .clipShape(RoundedRectangle(cornerRadius: 8))

      VStack(alignment: .leading, spacing: 3) {
        Text(recipe.name)
          .font(.subheadline.weight(.medium))
          .lineLimit(2)
        if let kcal = recipe.kcal {
          Text("\(kcal) kcal")
            .font(.caption)
            .foregroundColor(.orange)
        }
      }

      Spacer()

      // Hartje
      Button {
        viewModel.toggleFavorite(recipe.recipeId)
      } label: {
        Image(systemName: viewModel.isFavorite(recipe.recipeId) ? "heart.fill" : "heart")
          .foregroundColor(viewModel.isFavorite(recipe.recipeId) ? .red : Color(.systemGray3))
          .font(.body)
      }
      .buttonStyle(.plain)
    }
    .padding(.vertical, 4)
  }
}
