import SwiftUI

struct WeekScreen: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  var body: some View {
    NavigationView {
      List {
        Section("Week instellingen") {
          Stepper("Jaar: \(viewModel.selection.year)", value: $viewModel.selection.year, in: 2024...2035)
          Stepper("Week: \(viewModel.selection.week)", value: $viewModel.selection.week, in: 1...53)
          Stepper("Kcal: \(viewModel.selection.kcal)", value: $viewModel.selection.kcal, in: 1000...3500, step: 50)
          Stepper(
            "Basis personen: \(viewModel.selection.basePersons)",
            value: $viewModel.selection.basePersons,
            in: 1...8
          )

          Button("Laad weekdata") {
            Task {
              await viewModel.loadWeekBundle()
            }
          }
          .disabled(viewModel.isLoading)
        }

        Section("Status") {
          if viewModel.isLoading {
            ProgressView("Laden...")
          }
          if viewModel.isUsingOfflineCache {
            Label("Offline cache actief", systemImage: "icloud.slash")
              .foregroundColor(.orange)
          } else {
            Label("Online data", systemImage: "icloud")
              .foregroundColor(.green)
          }
          if let lastError = viewModel.lastError {
            Text(lastError)
              .foregroundColor(.red)
          }
        }

        if let summary = viewModel.summary {
          Section("Weekoverzicht") {
            Text("Weekplan ID: \(summary.weekPlan.weekPlanId)")
            Text("Maaltijden: \(summary.weekPlan.mealCount)")
            Text("Coverage: \(Int(summary.matchStatus.coverageScore * 100))%")
            Text("Open issues: \(summary.matchStatus.unresolvedItems)")
          }
        }

        if let groceries = viewModel.groceries {
          Section("Boodschappen") {
            ForEach(groceries.groceries) { item in
              VStack(alignment: .leading, spacing: 4) {
                Text(item.canonicalName)
                Text(
                  "\(item.totalAmount.map { String(format: "%.2f", $0) } ?? "-") \(item.unit ?? "")"
                )
                .font(.caption)
                .foregroundColor(.secondary)
              }
            }
          }
        }
      }
      .navigationTitle("Week")
    }
  }
}
