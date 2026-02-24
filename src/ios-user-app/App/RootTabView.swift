import SwiftUI

struct RootTabView: View {
  var body: some View {
    TabView {
      WeekScreen()
        .tabItem {
          Label("Week", systemImage: "calendar")
        }

      MatchScreen()
        .tabItem {
          Label("Match", systemImage: "slider.horizontal.3")
        }

      OrderScreen()
        .tabItem {
          Label("Bestellen", systemImage: "cart")
        }
    }
  }
}
