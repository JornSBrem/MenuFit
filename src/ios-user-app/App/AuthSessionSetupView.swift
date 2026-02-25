import SwiftUI

struct AuthSessionSetupView: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  var body: some View {
    NavigationView {
      Form {
        Section {
          Text(
            viewModel.authGateState == .expired
              ? AppStrings.text(.onboardingSessionExpiredTitle)
              : AppStrings.text(.onboardingTitle)
          )
          .font(.headline)

          Text(
            viewModel.authGateState == .expired
              ? AppStrings.text(.onboardingSessionExpiredMessage)
              : AppStrings.text(.onboardingSubtitle)
          )
          .font(.subheadline)
          .foregroundColor(.secondary)
        }

        Section(AppStrings.text(.authSessionSection)) {
          SecureField(AppStrings.text(.onboardingTokenLabel), text: $viewModel.authDraft.accessToken)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled(true)
            .accessibilityIdentifier("onboarding-token-field")

          TextField(AppStrings.text(.onboardingSubjectLabel), text: $viewModel.authDraft.subjectId)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled(true)
            .accessibilityIdentifier("onboarding-subject-field")

          TextField(AppStrings.text(.onboardingPicnicLabel), text: $viewModel.authDraft.picnicAccountId)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled(true)
            .accessibilityIdentifier("onboarding-picnic-field")

          TextField(AppStrings.text(.onboardingHouseholdLabel), text: $viewModel.authDraft.householdId)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled(true)
            .accessibilityIdentifier("onboarding-household-field")

          TextField(AppStrings.text(.onboardingExpiryLabel), text: $viewModel.authDraft.expiresAtEpochText)
            .keyboardType(.numberPad)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled(true)
            .accessibilityIdentifier("onboarding-expiry-field")
        }

        Section {
          Button(
            viewModel.authGateState == .expired
              ? AppStrings.text(.onboardingRefreshSessionButton)
              : AppStrings.text(.onboardingStartSessionButton)
          ) {
            if viewModel.saveAuthSessionFromDraft() {
              Task {
                await viewModel.bootstrapIfNeeded()
              }
            }
          }
          .accessibilityIdentifier("onboarding-submit-button")
        }

        if viewModel.authGateState == .expired {
          Section {
            Button(AppStrings.text(.onboardingClearSessionButton), role: .destructive) {
              viewModel.clearAuthSession()
            }
            .accessibilityIdentifier("onboarding-clear-button")
          }
        }

        if let lastError = viewModel.lastError {
          Section(AppStrings.text(.errorSection)) {
            Text(lastError)
              .foregroundColor(.red)
          }
        }
      }
      .navigationTitle(AppStrings.text(.onboardingTitle))
      .accessibilityIdentifier("auth-onboarding-screen")
    }
  }
}
