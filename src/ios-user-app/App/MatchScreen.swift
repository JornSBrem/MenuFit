import SwiftUI

struct MatchScreen: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  var body: some View {
    NavigationView {
      List {
        if let summary = viewModel.summary {
          Section("Matching status") {
            Text("Totaal items: \(summary.matchStatus.totalItems)")
            Text("Resolved: \(summary.matchStatus.resolvedItems)")
            Text("Unresolved: \(summary.matchStatus.unresolvedItems)")
            Text("Coverage: \(Int(summary.matchStatus.coverageScore * 100))%")
          }
        } else {
          Section {
            Text("Nog geen weekdata geladen.")
              .foregroundColor(.secondary)
          }
        }

        if let groceries = viewModel.groceries {
          Section("Reconcile details") {
            ForEach(groceries.reconcile) { row in
              HStack {
                VStack(alignment: .leading, spacing: 4) {
                  Text(row.canonicalName)
                  if let note = row.note, !note.isEmpty {
                    Text(note)
                      .font(.caption)
                      .foregroundColor(.secondary)
                  }
                }
                Spacer()
                Text(row.reconcileStatus)
                  .font(.caption)
                  .foregroundColor(row.reconcileStatus == "matched" ? .green : .orange)
              }
            }
          }
        }
      }
      .navigationTitle("Match")
    }
  }
}
