import SwiftUI

struct OrderScreen: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  var body: some View {
    NavigationView {
      List {
        if let summary = viewModel.summary {
          Section(AppStrings.text(.orderPreflightSection)) {
            Text(AppStrings.text(.planId, summary.cartPlan.cartPlanId))
            Text(AppStrings.text(.cartItems, summary.cartPlan.itemCount))
            Text(AppStrings.text(.unresolvedItems, summary.cartPlan.unresolvedCount))
            Text(AppStrings.text(.orderExpectedAction, viewModel.orderExpectedActionText))
          }

          Section(AppStrings.text(.orderSection)) {
            Button(AppStrings.text(.orderConfirmSyncButton)) {
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
          Section(AppStrings.text(.orderSyncStatusSection)) {
            if let outcome = viewModel.orderSyncOutcome {
              switch outcome {
              case .success:
                Text(AppStrings.text(.orderSyncSuccess))
                  .foregroundColor(.green)
              case .partialFailure:
                Text(AppStrings.text(.orderSyncPartial))
                  .foregroundColor(.orange)
              case .failed:
                Text(AppStrings.text(.orderSyncFailed))
                  .foregroundColor(.red)
              }
            }
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
            if report.failedCount > 0 {
              Button(AppStrings.text(.orderRecoveryRetryButton)) {
                Task {
                  await viewModel.syncCartOnlineOnly()
                }
              }
            }
          }
        }

        if let lastError = viewModel.lastError {
          Section(AppStrings.text(.orderSyncStatusSection)) {
            if viewModel.orderSyncOutcome == .failed {
              Text(AppStrings.text(.orderSyncFailed))
                .foregroundColor(.red)
            }
            Text(lastError)
              .foregroundColor(.red)
            Button(AppStrings.text(.orderRecoveryRetryButton)) {
              Task {
                await viewModel.syncCartOnlineOnly()
              }
            }
          }
        }
      }
      .navigationTitle(AppStrings.text(.orderNavigationTitle))
    }
  }
}
