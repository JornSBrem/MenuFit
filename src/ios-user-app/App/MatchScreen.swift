import SwiftUI

struct MatchScreen: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  var body: some View {
    NavigationView {
      List {
        Section(AppStrings.text(.matchFlowSection)) {
          Button(AppStrings.text(.evaluateUnresolvedButton)) {
            Task {
              await viewModel.evaluateFirstUnresolvedMatch()
            }
          }
          .disabled(viewModel.isMatchLoading)

          Button(AppStrings.text(.refreshMatchQueueButton)) {
            Task {
              await viewModel.loadMatchQueue()
            }
          }
          .disabled(viewModel.isMatchLoading)

          if viewModel.isMatchLoading {
            ProgressView(AppStrings.text(.loading))
          }
        }

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

        if let evaluation = viewModel.lastMatchEvaluation {
          Section(AppStrings.text(.latestEvaluationSection)) {
            Text(AppStrings.text(.matchDecision, evaluation.evaluation.decision))
            if let topCandidateId = evaluation.evaluation.topCandidateId {
              Text(AppStrings.text(.topCandidate, topCandidateId))
            }
            Text(
              AppStrings.text(
                .finishPassAttempted,
                evaluation.finishPass.attempted ? AppStrings.text(.yes) : AppStrings.text(.no)
              )
            )
            if let suggested = evaluation.finishPass.suggestedCandidateId {
              Text(AppStrings.text(.finishPassSuggested, suggested))
            }
          }
        }

        if !viewModel.matchQueue.isEmpty {
          Section(AppStrings.text(.reviewQueueSection)) {
            ForEach(viewModel.matchQueue) { item in
              VStack(alignment: .leading, spacing: 8) {
                Text(item.query)
                  .font(.headline)
                Text(AppStrings.text(.queueStatus, item.status))
                  .font(.caption)
                  .foregroundColor(.secondary)
                HStack(spacing: 8) {
                  Button(AppStrings.text(.actionMap)) {
                    Task {
                      await viewModel.applyMatchAction(item: item, action: "map")
                    }
                  }
                  .buttonStyle(.borderedProminent)

                  Button(AppStrings.text(.actionSkip)) {
                    Task {
                      await viewModel.applyMatchAction(item: item, action: "skip")
                    }
                  }
                  .buttonStyle(.bordered)

                  Button(AppStrings.text(.actionDefer)) {
                    Task {
                      await viewModel.applyMatchAction(item: item, action: "defer")
                    }
                  }
                  .buttonStyle(.bordered)
                }
              }
            }
          }
        } else {
          Section {
            Text(AppStrings.text(.matchQueueEmpty))
              .foregroundColor(.secondary)
          }
        }

        if let lastReview = viewModel.lastMatchReview {
          Section(AppStrings.text(.lastReviewActionSection)) {
            Text(AppStrings.text(.reviewItem, lastReview.queueItem.itemId))
            Text(AppStrings.text(.reviewStatus, lastReview.queueItem.status))
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
