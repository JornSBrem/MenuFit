import SwiftUI

struct RecipesScreen: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel
  @State private var selectedMeal: GoldWeekMealView?
  @State private var showOnlyFavorites = false
  @State private var showFilterSheet = false

  private var displayedRecipes: [UserRecipeRecord] {
    let base = viewModel.filteredRecipes
    if showOnlyFavorites {
      return base.filter { viewModel.isFavorite($0.recipeId) }
    }
    return base
  }

  private let gridColumns = [GridItem(.adaptive(minimum: 156), spacing: 12)]

  var body: some View {
    NavigationView {
      ScrollView {
        VStack(alignment: .leading, spacing: 0) {
          searchBar
          toolbarRow
          quickFilters

          if viewModel.isRecipesLoading && displayedRecipes.isEmpty {
            loadingState
          } else if displayedRecipes.isEmpty {
            emptyState
          } else if viewModel.recipeDisplayMode == .grid {
            gridContent
          } else {
            listContent
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
      .sheet(isPresented: $showFilterSheet) {
        RecipeFiltersSheet()
          .environmentObject(viewModel)
      }
    }
  }

  private var searchBar: some View {
    HStack(spacing: 10) {
      Image(systemName: "magnifyingglass")
        .foregroundColor(.secondary)
        .font(.subheadline)
      TextField("Zoeken op recept, ingrediënt, etc.", text: $viewModel.recipesSearchText)
        .autocorrectionDisabled()
        .font(.subheadline)
      if !viewModel.recipesSearchText.isEmpty {
        Button {
          viewModel.recipesSearchText = ""
        } label: {
          Image(systemName: "xmark.circle.fill")
            .foregroundColor(.secondary)
        }
        .buttonStyle(.plain)
      }
    }
    .padding(12)
    .background(
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .fill(Color(.secondarySystemGroupedBackground))
    )
    .padding(.horizontal, 16)
    .padding(.top, 12)
  }

  private var toolbarRow: some View {
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
        showFilterSheet = true
      } label: {
        Image(systemName: activeFilterCount > 0 ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
          .foregroundColor(activeFilterCount > 0 ? MFColors.accent : .secondary)
          .font(.title3)
      }
      .buttonStyle(.plain)

      Picker("Weergave", selection: $viewModel.recipeDisplayMode) {
        Image(systemName: "list.bullet").tag(RecipeDisplayMode.list)
        Image(systemName: "square.grid.2x2").tag(RecipeDisplayMode.grid)
      }
      .pickerStyle(.segmented)
      .frame(width: 92)

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
  }

  @ViewBuilder
  private var quickFilters: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 8) {
        ForEach(RecipeQuickFilter.allCases) { filter in
          let selected = viewModel.selectedRecipeQuickFilter == filter
          Button {
            withAnimation(.snappy) { viewModel.selectedRecipeQuickFilter = filter }
          } label: {
            Text(filter.title)
              .font(.caption.weight(.medium))
              .padding(.horizontal, 12)
              .padding(.vertical, 8)
              .background(
                Capsule()
                  .fill(selected ? MFColors.accent : Color(.secondarySystemGroupedBackground))
              )
              .foregroundColor(selected ? .white : .primary)
          }
          .buttonStyle(.plain)
        }

        if !viewModel.selectedRecipeTags.isEmpty {
          ForEach(Array(viewModel.selectedRecipeTags).sorted(), id: \.self) { tag in
            Button {
              withAnimation(.snappy) { viewModel.toggleRecipeTag(tag) }
            } label: {
              HStack(spacing: 4) {
                Text(tag)
                Image(systemName: "xmark")
                  .font(.caption2.bold())
              }
              .font(.caption.weight(.medium))
              .padding(.horizontal, 12)
              .padding(.vertical, 8)
              .background(Capsule().fill(MFColors.info.opacity(0.16)))
              .foregroundColor(MFColors.info)
            }
            .buttonStyle(.plain)
          }
        }
      }
      .padding(.horizontal, 16)
      .padding(.bottom, 8)
    }
  }

  private var loadingState: some View {
    VStack(spacing: 12) {
      ForEach(0..<5, id: \.self) { _ in
        MFShimmer()
          .frame(height: 80)
          .padding(.horizontal, 16)
      }
    }
    .padding(.top, 8)
  }

  private var emptyState: some View {
    MFEmptyState(
      icon: showOnlyFavorites ? "heart.slash" : "fork.knife.circle",
      title: showOnlyFavorites ? "Geen favorieten" : "Geen recepten",
      subtitle: showOnlyFavorites
        ? "Tik op het hartje in een recept om favorieten toe te voegen."
        : viewModel.recipes.isEmpty
          ? "Laad weekdata om recepten te importeren."
          : "Geen recepten gevonden voor je huidige zoek- en filterselectie."
    )
  }

  private var listContent: some View {
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

  private var gridContent: some View {
    LazyVGrid(columns: gridColumns, spacing: 12) {
      ForEach(displayedRecipes) { recipe in
        Button { selectedMeal = recipe.toMealView() } label: {
          recipeGridCard(recipe)
        }
        .buttonStyle(.plain)
      }
    }
    .padding(.horizontal, 16)
    .padding(.top, 4)
  }

  private func recipeRow(_ recipe: UserRecipeRecord) -> some View {
    HStack(spacing: 12) {
      MFAsyncImage(urlString: recipe.imageUrl, width: 64, height: 64, cornerRadius: 12)

      VStack(alignment: .leading, spacing: 6) {
        Text(recipe.name)
          .font(.subheadline.weight(.semibold))
          .foregroundColor(.primary)
          .lineLimit(2)
          .multilineTextAlignment(.leading)

        HStack(spacing: 6) {
          if let prep = recipe.prepTimes?.first?.label {
            MFPill(text: prep, icon: "clock", color: .secondary)
          }
          if let kcal = recipe.kcal {
            MFKcalBadge(kcal: kcal)
          }
        }

        if let firstTag = recipe.tags?.first {
          Text(firstTag)
            .font(.caption)
            .foregroundColor(.secondary)
            .lineLimit(1)
        }
      }

      Spacer()

      favoriteButton(recipe.recipeId)
    }
    .mfCard(padding: 12, cornerRadius: 14)
  }

  private func recipeGridCard(_ recipe: UserRecipeRecord) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      MFAsyncImage(urlString: recipe.imageUrl, width: 156, height: 116, cornerRadius: 14)

      Text(recipe.name)
        .font(.subheadline.weight(.semibold))
        .foregroundColor(.primary)
        .lineLimit(2)
        .multilineTextAlignment(.leading)

      VStack(alignment: .leading, spacing: 6) {
        if let prep = recipe.prepTimes?.first?.label {
          MFPill(text: prep, icon: "clock", color: .secondary)
        }
        if let kcal = recipe.kcal {
          MFKcalBadge(kcal: kcal)
        }
      }

      HStack {
        if let firstTag = recipe.tags?.first {
          Text(firstTag)
            .font(.caption)
            .foregroundColor(.secondary)
            .lineLimit(1)
        }
        Spacer()
        favoriteButton(recipe.recipeId)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .mfCard(padding: 12, cornerRadius: 16)
  }

  private func favoriteButton(_ recipeId: String) -> some View {
    Button {
      viewModel.toggleFavorite(recipeId)
    } label: {
      Image(systemName: viewModel.isFavorite(recipeId) ? "heart.fill" : "heart")
        .foregroundColor(viewModel.isFavorite(recipeId) ? .red : Color(.tertiaryLabel))
        .font(.title3)
        .contentTransition(.symbolEffect(.replace))
    }
    .buttonStyle(.plain)
  }

  private var activeFilterCount: Int {
    var count = 0
    if viewModel.selectedRecipeQuickFilter != .all { count += 1 }
    count += viewModel.selectedRecipeTags.count
    return count
  }
}

private struct RecipeFiltersSheet: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationView {
      ScrollView {
        VStack(alignment: .leading, spacing: 20) {
          VStack(alignment: .leading, spacing: 10) {
            MFSectionHeader(title: "Snelle filters", icon: "slider.horizontal.3")
            ScrollView(.horizontal, showsIndicators: false) {
              HStack(spacing: 8) {
                ForEach(RecipeQuickFilter.allCases) { filter in
                  let selected = viewModel.selectedRecipeQuickFilter == filter
                  Button {
                    viewModel.selectedRecipeQuickFilter = filter
                  } label: {
                    Text(filter.title)
                      .font(.caption.weight(.medium))
                      .padding(.horizontal, 12)
                      .padding(.vertical, 8)
                      .background(Capsule().fill(selected ? MFColors.accent : Color(.secondarySystemGroupedBackground)))
                      .foregroundColor(selected ? .white : .primary)
                  }
                  .buttonStyle(.plain)
                }
              }
              .padding(.horizontal, 20)
            }
          }

          VStack(alignment: .leading, spacing: 10) {
            MFSectionHeader(title: "Tags", icon: "tag")
            if viewModel.availableRecipeTags.isEmpty {
              Text("Nog geen tags beschikbaar. Importeer eerst recepten.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .padding(.horizontal, 20)
            } else {
              tagCloud
            }
          }
        }
        .padding(.bottom, 32)
      }
      .background(Color(.systemGroupedBackground))
      .navigationTitle("Filteren")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Sluiten") { dismiss() }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("Wis") { viewModel.clearRecipeFilters() }
            .foregroundColor(MFColors.accent)
        }
      }
    }
  }

  private var tagCloud: some View {
    VStack(alignment: .leading, spacing: 10) {
      ForEach(chunked(viewModel.availableRecipeTags, size: 3), id: \.self) { row in
        HStack(alignment: .top, spacing: 8) {
          ForEach(row, id: \.self) { tag in
            let selected = viewModel.selectedRecipeTags.contains(tag)
            Button {
              viewModel.toggleRecipeTag(tag)
            } label: {
              Text(tag)
                .font(.caption.weight(.medium))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity)
                .background(
                  RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(selected ? MFColors.info.opacity(0.18) : Color(.secondarySystemGroupedBackground))
                )
                .foregroundColor(selected ? MFColors.info : .primary)
            }
            .buttonStyle(.plain)
          }
        }
        .padding(.horizontal, 20)
      }
    }
  }

  private func chunked(_ items: [String], size: Int) -> [[String]] {
    stride(from: 0, to: items.count, by: size).map {
      Array(items[$0..<min($0 + size, items.count)])
    }
  }
}
