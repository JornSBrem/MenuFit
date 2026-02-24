import SwiftUI

struct OrderScreen: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  var body: some View {
    NavigationView {
      List {
        if let summary = viewModel.summary {
          Section("Cart plan") {
            Text("Plan ID: \(summary.cartPlan.cartPlanId)")
            Text("Items: \(summary.cartPlan.itemCount)")
            Text("Unresolved: \(summary.cartPlan.unresolvedCount)")
          }

          Section("Bestellen") {
            Button("Sync naar Picnic (online)") {
              Task {
                await viewModel.syncCartOnlineOnly()
              }
            }
          }
        } else {
          Section {
            Text("Laad eerst weekdata om te kunnen bestellen.")
              .foregroundColor(.secondary)
          }
        }

        if let report = viewModel.lastSyncReport {
          Section("Laatste sync report") {
            Text("Report ID: \(report.reportId)")
            Text("Status: \(report.status)")
            Text("Synced: \(report.syncedCount)")
            Text("Failed: \(report.failedCount)")
            Text(report.idempotentReplay ? "Replay: ja" : "Replay: nee")
            if let externalCartId = report.externalCartId {
              Text("External cart: \(externalCartId)")
            }
            if let errors = report.errors, !errors.isEmpty {
              Text(errors.joined(separator: ", "))
                .foregroundColor(.red)
            }
          }
        }

        if let lastError = viewModel.lastError {
          Section("Fout") {
            Text(lastError)
              .foregroundColor(.red)
          }
        }
      }
      .navigationTitle("Bestellen")
    }
  }
}
