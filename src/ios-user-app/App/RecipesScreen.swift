import SwiftUI

struct RecipesScreen: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

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

        // ── Telling ───────────────────────────────────────────
        HStack {
          if viewModel.isRecipesLoading {
            Text("Recepten laden...")
              .font(.caption).foregroundColor(.secondary)
          } else {
            Text("Recepten: \(viewModel.filteredRecipes.count)\(viewModel.recipes.count != viewModel.filteredRecipes.count ? " van \(viewModel.recipes.count)" : "")")
              .font(.caption).foregroundColor(.secondary)
          }
          Spacer()
          Button {
            Task { await viewModel.loadRecipes() }
          } label: {
            Label("Ververs", systemImage: "arrow.clockwise")
              .font(.caption)
          }
          .disabled(viewModel.isRecipesLoading)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 6)

        Divider()

        // ── Inhoud ────────────────────────────────────────────
        if viewModel.isRecipesLoading {
          Spacer()
          ProgressView("Recepten laden...")
          Spacer()
        } else if viewModel.filteredRecipes.isEmpty {
          Spacer()
          VStack(spacing: 12) {
            Image(systemName: "fork.knife.circle")
              .font(.system(size: 48))
              .foregroundColor(.secondary)
            Text(
              viewModel.recipes.isEmpty
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
            ForEach(viewModel.filteredRecipes) { recipe in
              recipeRow(recipe)
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
      }
      Spacer()
    }
    .padding(.vertical, 2)
  }
}
