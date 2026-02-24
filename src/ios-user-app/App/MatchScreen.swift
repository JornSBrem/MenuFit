import SwiftUI

struct MatchScreen: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  var body: some View {
    NavigationView {
      List {
        if let summary = viewModel.summary {
          Section(AppStrings.text(.matchStatusSection)) {
            Text(AppStrings.text(.totalItems, summary.matchStatus.totalItems))
            Text(AppStrings.text(.resolvedItems, summary.matchStatus.resolvedItems))
            Text(AppStrings.text(.unresolvedItems, summary.matchStatus.unresolvedItems))
            Text(AppStrings.text(.coverage, Int(summary.matchStatus.coverageScore * 100)))
          }
        } else {
          Section {
            Text(AppStrings.text(.noWeekDataLoaded))
              .foregroundColor(.secondary)
          }
        }

        if let groceries = viewModel.groceries {
          Section(AppStrings.text(.reconcileDetailsSection)) {
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
      .navigationTitle(AppStrings.text(.matchNavigationTitle))
    }
  }
}
