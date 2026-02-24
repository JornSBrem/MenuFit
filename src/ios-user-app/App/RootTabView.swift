import SwiftUI

struct RootTabView: View {
  var body: some View {
    TabView {
      WeekScreen()
        .tabItem {
          Label(AppStrings.text(.tabWeek), systemImage: "calendar")
        }

      MatchScreen()
        .tabItem {
          Label(AppStrings.text(.tabMatch), systemImage: "slider.horizontal.3")
        }

      OrderScreen()
        .tabItem {
          Label(AppStrings.text(.tabOrder), systemImage: "cart")
        }
    }
  }
}
