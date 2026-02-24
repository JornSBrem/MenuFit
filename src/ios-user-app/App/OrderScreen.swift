import SwiftUI

struct OrderScreen: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  var body: some View {
    NavigationView {
      List {
        if let summary = viewModel.summary {
          Section(AppStrings.text(.cartPlanSection)) {
            Text(AppStrings.text(.planId, summary.cartPlan.cartPlanId))
            Text(AppStrings.text(.cartItems, summary.cartPlan.itemCount))
            Text(AppStrings.text(.unresolvedItems, summary.cartPlan.unresolvedCount))
          }

          Section(AppStrings.text(.orderSection)) {
            Button(AppStrings.text(.syncCartOnlineButton)) {
              Task {
                await viewModel.syncCartOnlineOnly()
              }
            }
          }
        } else {
          Section {
            Text(AppStrings.text(.loadWeekBeforeOrder))
              .foregroundColor(.secondary)
          }
        }

        if let report = viewModel.lastSyncReport {
          Section(AppStrings.text(.lastSyncReportSection)) {
            Text(AppStrings.text(.reportId, report.reportId))
            Text(AppStrings.text(.status, report.status))
            Text(AppStrings.text(.syncedCount, report.syncedCount))
            Text(AppStrings.text(.failedCount, report.failedCount))
            Text(
              AppStrings.text(
                .replay,
                report.idempotentReplay ? AppStrings.text(.replayYes) : AppStrings.text(.replayNo)
              )
            )
            if let externalCartId = report.externalCartId {
              Text(AppStrings.text(.externalCart, externalCartId))
            }
            if let errors = report.errors, !errors.isEmpty {
              Text(errors.joined(separator: ", "))
                .foregroundColor(.red)
            }
          }
        }

        if let lastError = viewModel.lastError {
          Section(AppStrings.text(.errorSection)) {
            Text(lastError)
              .foregroundColor(.red)
          }
        }
      }
      .navigationTitle(AppStrings.text(.orderNavigationTitle))
    }
  }
}
