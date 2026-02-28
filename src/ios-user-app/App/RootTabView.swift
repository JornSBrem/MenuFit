import SwiftUI

struct RootTabView: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel
  @State private var selectedTab = 0

  var body: some View {
    TabView(selection: $selectedTab) {
      WeekScreen()
        .tabItem {
          Label(AppStrings.text(.tabWeek), systemImage: "calendar")
        }
        .tag(0)

      RecipesScreen()
        .tabItem {
          Label(AppStrings.text(.tabRecipes), systemImage: "book.closed.fill")
        }
        .tag(1)

      if viewModel.picnicEnabled {
        OrderScreen()
          .tabItem {
            Label(AppStrings.text(.tabOrder), systemImage: "cart.fill")
          }
          .tag(2)

        MatchScreen()
          .tabItem {
            Label(AppStrings.text(.tabMatch), systemImage: "slider.horizontal.3")
          }
          .tag(3)
      }

      ConfigScreen()
        .tabItem {
          Label(AppStrings.text(.tabConfig), systemImage: "gearshape.fill")
        }
        .tag(viewModel.picnicEnabled ? 4 : 2)
    }
    .tint(MFColors.accent)
  }
}
