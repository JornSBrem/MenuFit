import SwiftUI

struct OrderScreen: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel
  @State private var showSyncReport = false
  @State private var skipStockItems = true
  @State private var skipOptionalIngredients = false

  var body: some View {
    NavigationView {
      ScrollView {
        VStack(alignment: .leading, spacing: 0) {

          WeekNavBar()

          // ── Week header ──────────────────────────────────────
          HStack(alignment: .center, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
              Text("Week \(viewModel.selection.week)")
                .font(.title2.bold())
              if let summary = viewModel.summary {
                Text("\(summary.weekPlan.kcal) kcal \u{00B7} \(summary.weekPlan.basePersons) personen")
                  .font(.caption).foregroundColor(.secondary)
              } else {
                Text("Geen weekdata geladen")
                  .font(.caption).foregroundColor(.secondary)
              }
            }
            Spacer()
            Button {
              viewModel.goToCurrentWeek()
            } label: {
              Label("Deze week", systemImage: "clock.arrow.circlepath")
                .font(.subheadline.weight(.medium))
            }
            .buttonStyle(.bordered)
            .tint(MFColors.accent)
            .disabled(viewModel.isCurrentWeekSelected && !viewModel.isLoading)
          }
          .padding(.horizontal, 20)
          .padding(.top, 14)

          if viewModel.isLoading {
            ProgressView().scaleEffect(0.8).padding(.horizontal, 20).padding(.top, 4)
          }
          if let err = viewModel.lastError {
            Text(err).font(.caption).foregroundColor(MFColors.error)
              .padding(.horizontal, 20).padding(.top, 4)
          }

          // ── Boodschappenlijst ────────────────────────────────
          if viewModel.groceries != nil {
            if viewModel.householdMembers.count > 1 {
              householdGroceriesSection
            }

            groceriesSection
          } else {
            MFEmptyState(
              icon: "bag",
              title: "Geen boodschappen",
              subtitle: "Laad weekdata voor de boodschappenlijst."
            )
          }

          // ── Picnic productmatching ───────────────────────────
          VStack(alignment: .leading, spacing: 12) {
            MFSectionHeader(title: "Picnic matching", icon: "arrow.triangle.2.circlepath")

            VStack(alignment: .leading, spacing: 12) {
              if viewModel.isMatchLoading {
                HStack(spacing: 8) {
                  ProgressView().scaleEffect(0.8)
                  Text("Matchen...").font(.subheadline).foregroundColor(.secondary)
                }
              } else {
                let unresolvedItems = viewModel.matchQueue.filter { $0.status != "resolved" }
                if unresolvedItems.isEmpty && !viewModel.matchQueue.isEmpty {
                  Label("Alle items gematcht", systemImage: "checkmark.circle.fill")
                    .foregroundColor(MFColors.success).font(.subheadline)
                } else if let first = unresolvedItems.first {
                  HStack(spacing: 8) {
                    MFPill(text: "\(unresolvedItems.count) open", icon: "exclamationmark.triangle", color: MFColors.warning)
                    Text(first.query)
                      .font(.caption).foregroundColor(.secondary).lineLimit(1)
                  }
                } else {
                  Text("Queue nog niet geladen")
                    .font(.subheadline).foregroundColor(.secondary)
                }
              }

              Button {
                Task { await viewModel.evaluateFirstUnresolvedMatch() }
              } label: {
                Label("Match producten", systemImage: "arrow.triangle.2.circlepath")
              }
              .buttonStyle(.mfPrimary(color: MFColors.success))
              .disabled(viewModel.isMatchLoading || viewModel.groceries == nil)
            }
            .mfCard()
            .padding(.horizontal, 16)
          }

          // ── Sync naar Picnic ─────────────────────────────────
          VStack(alignment: .leading, spacing: 12) {
            MFSectionHeader(title: "Sync naar Picnic", icon: "cart.badge.plus")

            VStack(alignment: .leading, spacing: 14) {
              Toggle("Voorraadartikelen overslaan", isOn: $skipStockItems)
                .font(.subheadline).tint(MFColors.accent)
              Toggle("Optionele ingrediënten overslaan", isOn: $skipOptionalIngredients)
                .font(.subheadline).tint(MFColors.accent)

              HStack(spacing: 10) {
                Button {
                  // dry run — nog niet geïmplementeerd
                } label: {
                  Label("Preview", systemImage: "eye")
                    .font(.subheadline.weight(.medium))
                }
                .buttonStyle(.bordered)
                .disabled(true)

                Button {
                  Task { await viewModel.syncCartOnlineOnly() }
                } label: {
                  Label("Sync", systemImage: "cart.badge.plus")
                    .font(.subheadline.weight(.medium))
                }
                .buttonStyle(.mfPrimary(color: MFColors.success))
                .disabled(viewModel.summary == nil || viewModel.isLoading)
              }
            }
            .mfCard()
            .padding(.horizontal, 16)
          }

          // ── Laatste sync rapport ─────────────────────────────
          if let report = viewModel.lastSyncReport {
            VStack(alignment: .leading, spacing: 0) {
              DisclosureGroup(isExpanded: $showSyncReport) {
                VStack(alignment: .leading, spacing: 10) {
                  Text("ID: \(report.reportId)")
                    .font(.caption).foregroundColor(.secondary)
                  HStack(spacing: 16) {
                    MFPill(text: "\(report.syncedCount) ok", icon: "checkmark.circle.fill", color: MFColors.success)
                    MFPill(text: "\(report.failedCount) mislukt", icon: "xmark.circle.fill",
                           color: report.failedCount > 0 ? MFColors.error : .secondary)
                  }
                  if report.idempotentReplay {
                    MFPill(text: "Replay", icon: "arrow.clockwise", color: MFColors.info)
                  }
                  if let errors = report.errors, !errors.isEmpty {
                    Text(errors.joined(separator: "\n"))
                      .font(.caption).foregroundColor(MFColors.error)
                  }
                  if report.failedCount > 0 {
                    Button("Opnieuw proberen") {
                      Task { await viewModel.syncCartOnlineOnly() }
                    }
                    .buttonStyle(.bordered)
                    .tint(MFColors.accent)
                  }
                }
                .padding(.top, 10)
              } label: {
                HStack(spacing: 8) {
                  let outcome = viewModel.orderSyncOutcome
                  Image(
                    systemName: outcome == .success
                      ? "checkmark.circle.fill"
                      : outcome == .partialFailure ? "exclamationmark.circle.fill" : "xmark.circle.fill"
                  )
                  .foregroundColor(
                    outcome == .success ? MFColors.success : outcome == .partialFailure ? MFColors.warning : MFColors.error
                  )
                  Text("Laatste sync rapport")
                    .font(.subheadline.weight(.semibold))
                  Spacer()
                }
              }
            }
            .mfCard()
            .padding(.horizontal, 16)
            .padding(.top, 8)
          }

          Spacer(minLength: 32)
        }
      }
      .background(Color(.systemGroupedBackground))
      .navigationTitle(AppStrings.text(.orderNavigationTitle))
      .navigationBarTitleDisplayMode(.inline)
    }
  }

  // MARK: Boodschappenlijst

  @ViewBuilder
  private var groceriesSection: some View {
    VStack(alignment: .leading, spacing: 0) {
      let progress = viewModel.groceryProgress
      HStack {
        MFSectionHeader(title: "Boodschappen", icon: "basket")
        Spacer()
        Text("\(progress.done)/\(progress.total)")
          .font(.subheadline.monospacedDigit()).foregroundColor(.secondary)
          .padding(.trailing, 20)
      }

      ForEach(viewModel.groceryGroups.keys.sorted(), id: \.self) { category in
        let items = viewModel.groceryGroups[category] ?? []
        VStack(alignment: .leading, spacing: 4) {
          Text(category)
            .font(.subheadline.bold())
            .foregroundColor(MFColors.accent)
            .padding(.horizontal, 20)
            .padding(.top, 10)

          VStack(spacing: 2) {
            ForEach(items) { item in
              let checked = viewModel.isGroceryChecked(item.canonicalName)
              Button { viewModel.toggleGroceryChecked(item.canonicalName) } label: {
                HStack(spacing: 10) {
                  Image(systemName: checked ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(checked ? MFColors.success : Color(.tertiaryLabel))
                    .font(.title3)
                    .contentTransition(.symbolEffect(.replace))
                  VStack(alignment: .leading, spacing: 2) {
                    Text(item.canonicalName)
                      .strikethrough(checked)
                      .foregroundColor(checked ? .secondary : .primary)
                      .font(.subheadline)
                    Text("\(item.totalAmount.map { String(format: "%.2f", $0) } ?? "-") \(item.unit ?? "")")
                      .font(.caption).foregroundColor(.secondary)
                  }
                  Spacer()
                }
                .padding(.vertical, 6)
                .padding(.horizontal, 16)
              }
              .buttonStyle(.plain)
            }
          }
          .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
              .fill(Color(.secondarySystemGroupedBackground))
          )
          .padding(.horizontal, 16)
        }
      }
    }
  }

  // MARK: Gezinstotalen

  @ViewBuilder
  private var householdGroceriesSection: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        MFSectionHeader(title: "Gezinstotalen", icon: "person.3")
        Spacer()
        Button {
          Task { await viewModel.loadHouseholdGroceries() }
        } label: {
          Image(systemName: "arrow.clockwise")
            .font(.subheadline)
        }
        .buttonStyle(.bordered)
        .controlSize(.small)
        .tint(MFColors.accent)
        .padding(.trailing, 16)
      }

      if let hg = viewModel.householdGroceries {
        // Ledeninfo
        ScrollView(.horizontal, showsIndicators: false) {
          HStack(spacing: 8) {
            ForEach(hg.memberBreakdown) { member in
              VStack(spacing: 3) {
                Text(member.displayName)
                  .font(.caption.weight(.semibold))
                MFPill(text: "\(member.kcal) kcal", color: MFColors.info)
              }
              .padding(.horizontal, 10)
              .padding(.vertical, 6)
              .background(Color(.secondarySystemGroupedBackground))
              .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
          }
          .padding(.horizontal, 20)
        }

        // Geaggregeerde items
        VStack(spacing: 4) {
          ForEach(hg.groceries) { item in
            HStack(spacing: 10) {
              Image(systemName: "basket.fill")
                .foregroundColor(MFColors.accent)
                .font(.caption)
              VStack(alignment: .leading, spacing: 2) {
                Text(item.canonicalName)
                  .font(.subheadline)
                Text("\(item.totalAmount.map { String(format: "%.2f", $0) } ?? "-") \(item.unit ?? "")")
                  .font(.caption).foregroundColor(.secondary)
              }
              Spacer()
              if item.requiresReview {
                Image(systemName: "exclamationmark.triangle.fill")
                  .foregroundColor(MFColors.warning)
                  .font(.caption)
              }
            }
            .padding(.vertical, 4)
            .padding(.horizontal, 16)
          }
        }
        .background(
          RoundedRectangle(cornerRadius: 14, style: .continuous)
            .fill(Color(.secondarySystemGroupedBackground))
        )
        .padding(.horizontal, 16)

        if hg.groceries.isEmpty {
          Text("Geen boodschappen voor dit gezin deze week.")
            .font(.caption).foregroundColor(.secondary)
            .padding(.horizontal, 20)
        }
      } else {
        Button {
          Task { await viewModel.loadHouseholdGroceries() }
        } label: {
          Label("Gezinstotalen laden", systemImage: "basket")
            .font(.subheadline.weight(.medium))
        }
        .buttonStyle(.bordered)
        .tint(MFColors.accent)
        .padding(.horizontal, 20)
      }
    }
  }
}
