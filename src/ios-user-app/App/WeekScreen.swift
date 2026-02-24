import SwiftUI

struct WeekScreen: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  var body: some View {
    NavigationView {
      List {
        Section(AppStrings.text(.weekSettingsSection)) {
          Stepper(
            AppStrings.text(.yearStepper, viewModel.selection.year),
            value: $viewModel.selection.year,
            in: 2024...2035
          )
          Stepper(
            AppStrings.text(.weekStepper, viewModel.selection.week),
            value: $viewModel.selection.week,
            in: 1...53
          )
          Stepper(
            AppStrings.text(.kcalStepper, viewModel.selection.kcal),
            value: $viewModel.selection.kcal,
            in: 1000...3500,
            step: 50
          )
          Stepper(
            AppStrings.text(.basePersonsStepper, viewModel.selection.basePersons),
            value: $viewModel.selection.basePersons,
            in: 1...8
          )

          Button(AppStrings.text(.loadWeekDataButton)) {
            Task {
              await viewModel.loadWeekBundle()
            }
          }
          .disabled(viewModel.isLoading)
        }

        Section(AppStrings.text(.statusSection)) {
          if viewModel.isLoading {
            ProgressView(AppStrings.text(.loading))
          }
          if viewModel.isUsingOfflineCache {
            Label(AppStrings.text(.offlineCacheActive), systemImage: "icloud.slash")
              .foregroundColor(.orange)
          } else {
            Label(AppStrings.text(.onlineData), systemImage: "icloud")
              .foregroundColor(.green)
          }
          if let lastError = viewModel.lastError {
            Text(lastError)
              .foregroundColor(.red)
          }
        }

        if let summary = viewModel.summary {
          Section(AppStrings.text(.weekOverviewSection)) {
            Text(AppStrings.text(.weekPlanId, summary.weekPlan.weekPlanId))
            Text(AppStrings.text(.mealCount, summary.weekPlan.mealCount))
            Text(AppStrings.text(.coverage, Int(summary.matchStatus.coverageScore * 100)))
            Text(AppStrings.text(.openIssues, summary.matchStatus.unresolvedItems))
          }
        }

        if let groceries = viewModel.groceries {
          Section(AppStrings.text(.groceriesSection)) {
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
      .navigationTitle(AppStrings.text(.weekNavigationTitle))
    }
  }
}
