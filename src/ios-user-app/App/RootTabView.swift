import SwiftUI

struct RootTabView: View {
  var body: some View {
    TabView {
      WeekScreen()
        .tabItem {
          Label(AppStrings.text(.tabWeek), systemImage: "calendar")
        }

      RecipesScreen()
        .tabItem {
          Label(AppStrings.text(.tabRecipes), systemImage: "book.closed")
        }

      OrderScreen()
        .tabItem {
          Label(AppStrings.text(.tabOrder), systemImage: "cart")
        }

      MatchScreen()
        .tabItem {
          Label(AppStrings.text(.tabMatch), systemImage: "slider.horizontal.3")
        }

      ConfigScreen()
        .tabItem {
          Label(AppStrings.text(.tabConfig), systemImage: "gearshape")
        }
    }
  }
}
