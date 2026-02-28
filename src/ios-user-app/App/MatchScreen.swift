import SwiftUI

struct MatchScreen: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  var body: some View {
    NavigationView {
      ScrollView {
        VStack(alignment: .leading, spacing: 0) {

          // ── Acties ─────────────────────────────────────────
          MFSectionHeader(title: "Match flow", icon: "arrow.triangle.2.circlepath")

          VStack(spacing: 10) {
            Button {
              Task { await viewModel.evaluateFirstUnresolvedMatch() }
            } label: {
              Label(AppStrings.text(.evaluateUnresolvedButton), systemImage: "wand.and.stars")
                .font(.subheadline.weight(.medium))
            }
            .buttonStyle(.mfPrimary(color: MFColors.success))
            .disabled(viewModel.isMatchLoading)

            Button {
              Task { await viewModel.loadMatchQueue() }
            } label: {
              Label(AppStrings.text(.refreshMatchQueueButton), systemImage: "arrow.clockwise")
                .font(.subheadline.weight(.medium))
            }
            .buttonStyle(.bordered)
            .tint(MFColors.accent)
            .disabled(viewModel.isMatchLoading)

            if viewModel.isMatchLoading {
              HStack(spacing: 8) {
                ProgressView().scaleEffect(0.8)
                Text(AppStrings.text(.loading))
                  .font(.caption).foregroundColor(.secondary)
              }
            }
          }
          .mfCard()
          .padding(.horizontal, 16)

          // ── Status ─────────────────────────────────────────
          if let summary = viewModel.summary {
            MFSectionHeader(title: "Status", icon: "chart.bar")

            VStack(spacing: 8) {
              statusRow(label: AppStrings.text(.totalItems, summary.matchStatus.totalItems),
                        icon: "number", color: .primary)
              statusRow(label: AppStrings.text(.resolvedItems, summary.matchStatus.resolvedItems),
                        icon: "checkmark.circle.fill", color: MFColors.success)
              statusRow(label: AppStrings.text(.unresolvedItems, summary.matchStatus.unresolvedItems),
                        icon: "questionmark.circle.fill", color: MFColors.warning)

              // Coverage bar
              HStack(spacing: 10) {
                Image(systemName: "chart.pie.fill")
                  .foregroundColor(MFColors.info).font(.subheadline)
                Text(AppStrings.text(.coverage, Int(summary.matchStatus.coverageScore * 100)))
                  .font(.subheadline)
                Spacer()
                Text("\(Int(summary.matchStatus.coverageScore * 100))%")
                  .font(.subheadline.bold().monospacedDigit())
                  .foregroundColor(MFColors.success)
              }
              ProgressView(value: summary.matchStatus.coverageScore)
                .tint(MFColors.success)
            }
            .mfCard()
            .padding(.horizontal, 16)
          } else {
            MFEmptyState(
              icon: "chart.bar.xaxis",
              title: AppStrings.text(.noWeekDataLoaded),
              subtitle: "Laad weekdata om matchstatus te bekijken."
            )
          }

          // ── Laatste evaluatie ──────────────────────────────
          if let evaluation = viewModel.lastMatchEvaluation {
            MFSectionHeader(title: "Laatste evaluatie", icon: "sparkles")

            VStack(alignment: .leading, spacing: 8) {
              HStack(spacing: 8) {
                MFPill(text: evaluation.evaluation.decision, icon: "lightbulb.fill", color: MFColors.accent)
              }
              if let topCandidateId = evaluation.evaluation.topCandidateId {
                Text(AppStrings.text(.topCandidate, topCandidateId))
                  .font(.caption).foregroundColor(.secondary)
              }
              HStack(spacing: 8) {
                MFPill(
                  text: evaluation.finishPass.attempted ? AppStrings.text(.yes) : AppStrings.text(.no),
                  icon: "flag.fill",
                  color: evaluation.finishPass.attempted ? MFColors.success : .secondary
                )
                if let suggested = evaluation.finishPass.suggestedCandidateId {
                  Text("Suggestie: \(suggested)")
                    .font(.caption).foregroundColor(.secondary)
                }
              }
            }
            .mfCard()
            .padding(.horizontal, 16)
          }

          // ── Review Queue ──────────────────────────────────
          if !viewModel.matchQueue.isEmpty {
            MFSectionHeader(title: "Review queue", icon: "list.clipboard")

            VStack(spacing: 8) {
              ForEach(viewModel.matchQueue) { item in
                VStack(alignment: .leading, spacing: 10) {
                  HStack {
                    Text(item.query)
                      .font(.subheadline.bold())
                    Spacer()
                    MFPill(text: item.status, color: item.status == "resolved" ? MFColors.success : MFColors.warning)
                  }

                  HStack(spacing: 8) {
                    Button {
                      Task { await viewModel.applyMatchAction(item: item, action: "map") }
                    } label: {
                      Label(AppStrings.text(.actionMap), systemImage: "link")
                        .font(.caption.bold())
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(MFColors.accent)

                    Button {
                      Task { await viewModel.applyMatchAction(item: item, action: "skip") }
                    } label: {
                      Text(AppStrings.text(.actionSkip))
                        .font(.caption.bold())
                    }
                    .buttonStyle(.bordered)

                    Button {
                      Task { await viewModel.applyMatchAction(item: item, action: "defer") }
                    } label: {
                      Text(AppStrings.text(.actionDefer))
                        .font(.caption.bold())
                    }
                    .buttonStyle(.bordered)
                  }
                }
                .mfCard(padding: 14, cornerRadius: 14)
              }
            }
            .padding(.horizontal, 16)
          } else {
            MFEmptyState(
              icon: "tray",
              title: AppStrings.text(.matchQueueEmpty),
              subtitle: "Er zijn geen items in de review queue."
            )
          }

          // ── Laatste review ────────────────────────────────
          if let lastReview = viewModel.lastMatchReview {
            MFSectionHeader(title: "Laatste review", icon: "clock.arrow.circlepath")

            VStack(alignment: .leading, spacing: 6) {
              Text(AppStrings.text(.reviewItem, lastReview.queueItem.itemId))
                .font(.subheadline)
              MFPill(text: lastReview.queueItem.status, color: MFColors.info)
            }
            .mfCard()
            .padding(.horizontal, 16)
          }

          // ── Reconcile ─────────────────────────────────────
          if let groceries = viewModel.groceries {
            MFSectionHeader(title: "Reconcile", icon: "arrow.triangle.merge")

            VStack(spacing: 4) {
              ForEach(groceries.reconcile) { row in
                HStack {
                  VStack(alignment: .leading, spacing: 3) {
                    Text(row.canonicalName)
                      .font(.subheadline)
                    if let note = row.note, !note.isEmpty {
                      Text(note)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    }
                  }
                  Spacer()
                  MFPill(
                    text: row.reconcileStatus,
                    color: row.reconcileStatus == "matched" ? MFColors.success : MFColors.warning
                  )
                }
                .padding(.vertical, 6)
                .padding(.horizontal, 16)
              }
            }
            .background(
              RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color(.secondarySystemGroupedBackground))
            )
            .padding(.horizontal, 16)
          }

          Spacer(minLength: 32)
        }
      }
      .background(Color(.systemGroupedBackground))
      .navigationTitle(AppStrings.text(.matchNavigationTitle))
      .navigationBarTitleDisplayMode(.large)
    }
  }

  private func statusRow(label: String, icon: String, color: Color) -> some View {
    HStack(spacing: 10) {
      Image(systemName: icon)
        .foregroundColor(color).font(.subheadline)
      Text(label)
        .font(.subheadline)
      Spacer()
    }
  }
}
