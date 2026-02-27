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

          // ── Week titel ───────────────────────────────────────
          VStack(alignment: .leading, spacing: 4) {
            HStack {
              VStack(alignment: .leading, spacing: 2) {
                Text("Week \(viewModel.selection.week), \(viewModel.selection.year)")
                  .font(.headline)
                if let summary = viewModel.summary {
                  Text("\(summary.weekPlan.kcal) kcal · \(summary.weekPlan.basePersons) personen")
                    .font(.caption).foregroundColor(.secondary)
                } else {
                  Text("Geen weekdata geladen")
                    .font(.caption).foregroundColor(.secondary)
                }
              }
              Spacer()
              Button("Deze week") { viewModel.goToCurrentWeek() }
                .buttonStyle(.bordered)
                .disabled(viewModel.isCurrentWeekSelected && !viewModel.isLoading)
            }
            if viewModel.isLoading {
              ProgressView().scaleEffect(0.8).frame(maxWidth: .infinity, alignment: .leading)
            }
            if let err = viewModel.lastError {
              Text(err).font(.caption).foregroundColor(.red)
            }
          }
          .padding(.horizontal, 20)
          .padding(.top, 10)
          .padding(.bottom, 4)

          Divider().padding(.horizontal, 16).padding(.top, 8)

          // ── Boodschappenlijst ────────────────────────────────
          if viewModel.groceries != nil {
            groceriesSection
              .padding(.horizontal, 16)
              .padding(.top, 16)
          } else {
            HStack(spacing: 8) {
              Image(systemName: "bag").foregroundColor(.secondary)
              Text("Laad weekdata voor de boodschappenlijst")
                .font(.subheadline).foregroundColor(.secondary)
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
          }

          Divider().padding(.horizontal, 16).padding(.top, 20)

          // ── Picnic productmatching ───────────────────────────
          VStack(alignment: .leading, spacing: 10) {
            Text("Picnic productmatching").font(.title3.bold())

            if viewModel.isMatchLoading {
              ProgressView("Matchen...")
            } else {
              let unresolvedItems = viewModel.matchQueue.filter { $0.status != "resolved" }
              if unresolvedItems.isEmpty && !viewModel.matchQueue.isEmpty {
                Label("Alle items gematcht", systemImage: "checkmark.circle.fill")
                  .foregroundColor(.green).font(.subheadline)
              } else if let first = unresolvedItems.first {
                HStack {
                  VStack(alignment: .leading, spacing: 2) {
                    Text("\(unresolvedItems.count) items nog niet gematcht")
                      .font(.subheadline).foregroundColor(.orange)
                    Text("Eerste: \(first.query)")
                      .font(.caption).foregroundColor(.secondary)
                  }
                  Spacer()
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
            .buttonStyle(.borderedProminent)
            .tint(.green)
            .disabled(viewModel.isMatchLoading || viewModel.groceries == nil)
          }
          .padding(.horizontal, 20)
          .padding(.top, 16)

          Divider().padding(.horizontal, 16).padding(.top, 16)

          // ── Sync naar Picnic ─────────────────────────────────
          VStack(alignment: .leading, spacing: 10) {
            Text("Sync naar Picnic").font(.title3.bold())

            Toggle("Voorraadartikelen overslaan", isOn: $skipStockItems)
              .font(.subheadline)
            Toggle("Optionele ingrediënten overslaan", isOn: $skipOptionalIngredients)
              .font(.subheadline)

            HStack(spacing: 10) {
              Button {
                // dry run — nog niet geïmplementeerd
              } label: {
                Label("Preview (dry run)", systemImage: "eye")
              }
              .buttonStyle(.bordered)
              .disabled(true)

              Button {
                Task { await viewModel.syncCartOnlineOnly() }
              } label: {
                Label("Sync naar Picnic", systemImage: "cart.badge.plus")
              }
              .buttonStyle(.borderedProminent)
              .tint(.green)
              .disabled(viewModel.summary == nil || viewModel.isLoading)
            }
          }
          .padding(.horizontal, 20)
          .padding(.top, 16)

          // ── Laatste sync rapport ─────────────────────────────
          if let report = viewModel.lastSyncReport {
            VStack(alignment: .leading, spacing: 0) {
              DisclosureGroup(isExpanded: $showSyncReport) {
                VStack(alignment: .leading, spacing: 8) {
                  Text("Report: \(report.reportId)")
                    .font(.caption).foregroundColor(.secondary)
                  HStack(spacing: 16) {
                    Label("\(report.syncedCount) ok", systemImage: "checkmark.circle.fill")
                      .foregroundColor(.green).font(.subheadline)
                    Label("\(report.failedCount) mislukt", systemImage: "xmark.circle.fill")
                      .foregroundColor(report.failedCount > 0 ? .red : .secondary)
                      .font(.subheadline)
                  }
                  if report.idempotentReplay {
                    Label("Idempotent replay", systemImage: "arrow.clockwise")
                      .font(.caption).foregroundColor(.secondary)
                  }
                  if let errors = report.errors, !errors.isEmpty {
                    Text(errors.joined(separator: "\n"))
                      .font(.caption).foregroundColor(.red)
                  }
                  if report.failedCount > 0 {
                    Button("Opnieuw proberen") {
                      Task { await viewModel.syncCartOnlineOnly() }
                    }
                    .buttonStyle(.bordered)
                  }
                }
                .padding(.top, 8)
              } label: {
                HStack(spacing: 8) {
                  let outcome = viewModel.orderSyncOutcome
                  Image(
                    systemName: outcome == .success
                      ? "checkmark.circle.fill"
                      : outcome == .partialFailure ? "exclamationmark.circle.fill" : "xmark.circle.fill"
                  )
                  .foregroundColor(
                    outcome == .success ? .green : outcome == .partialFailure ? .orange : .red
                  )
                  Text("Laatste sync rapport")
                    .font(.subheadline.weight(.semibold))
                  Spacer()
                }
              }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(Color(.secondarySystemBackground))
            .cornerRadius(10)
            .padding(.horizontal, 16)
            .padding(.top, 16)
          }

          Spacer(minLength: 32)
        }
      }
      .navigationTitle(AppStrings.text(.orderNavigationTitle))
      .navigationBarTitleDisplayMode(.inline)
    }
  }

  // MARK: Boodschappenlijst

  @ViewBuilder
  private var groceriesSection: some View {
    let progress = viewModel.groceryProgress
    HStack {
      Text(AppStrings.text(.groceriesSection)).font(.title3.bold())
      Spacer()
      Text(AppStrings.text(.groceriesProgress, progress.done, progress.total))
        .font(.subheadline).foregroundColor(.secondary)
    }
    ForEach(viewModel.groceryGroups.keys.sorted(), id: \.self) { category in
      let items = viewModel.groceryGroups[category] ?? []
      VStack(alignment: .leading, spacing: 4) {
        Text(category).font(.headline).padding(.top, 6)
        ForEach(items) { item in
          let checked = viewModel.isGroceryChecked(item.canonicalName)
          Button { viewModel.toggleGroceryChecked(item.canonicalName) } label: {
            HStack(spacing: 10) {
              Image(systemName: checked ? "checkmark.circle.fill" : "circle")
                .foregroundColor(checked ? .green : .gray)
              VStack(alignment: .leading, spacing: 2) {
                Text(item.canonicalName)
                  .strikethrough(checked)
                  .foregroundColor(checked ? .secondary : .primary)
                Text(
                  "\(item.totalAmount.map { String(format: "%.2f", $0) } ?? "-") \(item.unit ?? "")"
                )
                .font(.caption).foregroundColor(.secondary)
              }
              Spacer()
            }
          }
          .buttonStyle(.plain)
          .padding(.vertical, 2)
        }
      }
    }
  }
}
