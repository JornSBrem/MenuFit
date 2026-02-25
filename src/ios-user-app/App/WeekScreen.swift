import SwiftUI

struct WeekScreen: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  var body: some View {
    NavigationView {
      List {
        Section(AppStrings.text(.householdMembersSection)) {
          ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
              ForEach(viewModel.householdMembers) { member in
                Button(member.userId) {
                  viewModel.selectMember(member.userId)
                }
                .buttonStyle(.borderedProminent)
                .tint(viewModel.selectedMemberId == member.userId ? .blue : .gray)
              }
            }
            .padding(.vertical, 4)
          }
          Text(AppStrings.text(.selectedMemberLabel, viewModel.selectedMemberId))
            .font(.caption)
            .foregroundColor(.secondary)
        }

        Section(AppStrings.text(.weekMenuSection)) {
          HStack {
            Button(AppStrings.text(.weekPreviousButton)) {
              viewModel.goToPreviousWeek()
            }
            Spacer()
            Text("J\(viewModel.selection.year) • W\(viewModel.selection.week)")
              .font(.headline)
            Spacer()
            Button(AppStrings.text(.weekNextButton)) {
              viewModel.goToNextWeek()
            }
          }
        }

        Section(AppStrings.text(.weekDaysSection)) {
          ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
              ForEach(viewModel.availableDayLabels, id: \.self) { dayLabel in
                Button(dayLabel.capitalized) {
                  viewModel.selectDay(dayLabel)
                }
                .buttonStyle(.bordered)
                .tint(viewModel.selectedDayLabel == dayLabel ? .blue : .gray)
              }
            }
            .padding(.vertical, 4)
          }
        }

        Section("\(AppStrings.text(.todayMenuSection)): \(viewModel.selectedDayLabel.capitalized)") {
          if viewModel.selectedDayMeals.isEmpty {
            Text(AppStrings.text(.noMealsForSelectedDay))
              .foregroundColor(.secondary)
          } else {
            ForEach(viewModel.selectedDayMeals) { meal in
              VStack(alignment: .leading, spacing: 4) {
                Text(meal.mealLabel)
                if let recipeId = meal.recipeId, !recipeId.isEmpty {
                  Text(recipeId)
                    .font(.caption)
                    .foregroundColor(.secondary)
                }
              }
            }
          }
        }

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

        Section(AppStrings.text(.authSessionSection)) {
          if let session = viewModel.authSession {
            Text(AppStrings.text(.authSubject, session.subjectId))
            Text(AppStrings.text(.authPicnicAccount, session.picnicAccountId))
            Text(AppStrings.text(.authHousehold, session.householdId))
            if let expiry = session.expiresAtEpochSeconds {
              Text(AppStrings.text(.authExpiry, expiry))
            } else {
              Text(AppStrings.text(.authExpiryMissing))
            }
          } else {
            Text(AppStrings.text(.authSessionMissing))
              .foregroundColor(.orange)
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

        if viewModel.groceries != nil {
          Section(AppStrings.text(.groceriesSection)) {
            let progress = viewModel.groceryProgress
            Text(AppStrings.text(.groceriesProgress, progress.done, progress.total))
              .font(.subheadline)
              .foregroundColor(.secondary)

            ForEach(viewModel.groceryGroups.keys.sorted(), id: \.self) { category in
              let items = viewModel.groceryGroups[category] ?? []
              let openItems = items.filter { !viewModel.isGroceryChecked($0.canonicalName) }
              let doneItems = items.filter { viewModel.isGroceryChecked($0.canonicalName) }

              VStack(alignment: .leading, spacing: 8) {
                Text(category)
                  .font(.headline)

                if !openItems.isEmpty {
                  Text(AppStrings.text(.groceriesOpenSection))
                    .font(.caption)
                    .foregroundColor(.secondary)
                  ForEach(openItems) { item in
                    groceryRow(item: item, checked: false)
                  }
                }

                if !doneItems.isEmpty {
                  Text(AppStrings.text(.groceriesCompletedSection))
                    .font(.caption)
                    .foregroundColor(.secondary)
                  ForEach(doneItems) { item in
                    groceryRow(item: item, checked: true)
                  }
                }
              }
            }
          }
        }
      }
      .navigationTitle(AppStrings.text(.weekNavigationTitle))
    }
  }

  @ViewBuilder
  private func groceryRow(item: GoldGroceryTotalView, checked: Bool) -> some View {
    Button {
      viewModel.toggleGroceryChecked(item.canonicalName)
    } label: {
      HStack(alignment: .top, spacing: 10) {
        Image(systemName: checked ? "checkmark.circle.fill" : "circle")
          .foregroundColor(checked ? .green : .gray)

        VStack(alignment: .leading, spacing: 4) {
          Text(item.canonicalName)
            .strikethrough(checked)
          Text(
            "\(item.totalAmount.map { String(format: "%.2f", $0) } ?? "-") \(item.unit ?? "")"
          )
          .font(.caption)
          .foregroundColor(.secondary)
        }
      }
    }
    .buttonStyle(.plain)
  }
}
