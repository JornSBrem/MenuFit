import SwiftUI

// MARK: - Main Auth / Onboarding View

struct AuthSessionSetupView: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  @State private var isLoginMode = true
  @State private var email = ""
  @State private var username = ""
  @State private var password = ""
  @State private var confirmPassword = ""
  @State private var isLoading = false

  // Onboarding steps (na registratie)
  @State private var showOnboarding = false
  @State private var onboardingStep = 0

  // Profiel data (onboarding)
  @State private var displayName = ""
  @State private var birthYear = ""
  @State private var gender = "male"
  @State private var weightKg = ""
  @State private var heightCm = ""
  @State private var activityLevel = "moderate"
  @State private var selectedKcal: Int = 1800

  private let genderOptions = [("male", "Man"), ("female", "Vrouw"), ("other", "Anders")]
  private let activityOptions = [
    ("sedentary", "Zittend (weinig beweging)"),
    ("light", "Licht actief (1-2x/week)"),
    ("moderate", "Matig actief (3-5x/week)"),
    ("active", "Actief (6-7x/week)"),
    ("very_active", "Zeer actief (intensief)"),
  ]

  var body: some View {
    NavigationView {
      Group {
        if showOnboarding || viewModel.needsOnboarding {
          onboardingContent
        } else {
          authContent
        }
      }
      .navigationTitle("MenuFit")
      .navigationBarTitleDisplayMode(.inline)
    }
  }

  // MARK: - Login / Register Form

  private var authContent: some View {
    Form {
      Section {
        VStack(alignment: .leading, spacing: 6) {
          Text(isLoginMode ? "Welkom terug" : "Account aanmaken")
            .font(.headline)
          Text(isLoginMode
            ? "Log in met je e-mail of gebruikersnaam."
            : "Maak een nieuw account aan om MenuFit te gebruiken."
          )
          .font(.subheadline)
          .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
      }

      Section {
        Picker("", selection: $isLoginMode) {
          Text("Inloggen").tag(true)
          Text("Registreren").tag(false)
        }
        .pickerStyle(.segmented)
      }

      Section("Inloggegevens") {
        TextField("E-mailadres", text: $email)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled(true)
          .textContentType(.emailAddress)
          .keyboardType(.emailAddress)
          .accessibilityIdentifier("auth-email-field")

        if !isLoginMode {
          TextField("Gebruikersnaam", text: $username)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled(true)
            .textContentType(.username)
            .accessibilityIdentifier("auth-username-field")
        }

        SecureField("Wachtwoord", text: $password)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled(true)
          .textContentType(isLoginMode ? .password : .newPassword)
          .accessibilityIdentifier("auth-password-field")

        if !isLoginMode {
          SecureField("Bevestig wachtwoord", text: $confirmPassword)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled(true)
            .textContentType(.newPassword)
            .accessibilityIdentifier("auth-confirm-password-field")
        }
      }

      Section {
        Button {
          submit()
        } label: {
          HStack {
            Spacer()
            if isLoading {
              ProgressView()
            } else {
              Text(isLoginMode ? "Inloggen" : "Account aanmaken")
                .bold()
            }
            Spacer()
          }
        }
        .disabled(isLoading || !isFormValid)
        .accessibilityIdentifier("auth-submit-button")
      }

      if let lastError = viewModel.lastError {
        Section {
          Text(lastError)
            .foregroundColor(.red)
            .font(.footnote)
        }
      }

      if viewModel.authGateState == .expired {
        Section {
          Button("Sessie wissen", role: .destructive) {
            viewModel.clearAuthSession()
          }
        }
      }
    }
    .onChange(of: isLoginMode) { _ in
      viewModel.lastError = nil
      confirmPassword = ""
    }
  }

  private var isFormValid: Bool {
    let hasEmail = !email.trimmingCharacters(in: .whitespaces).isEmpty
    let hasPassword = !password.isEmpty
    if isLoginMode {
      return hasEmail && hasPassword
    }
    let hasUsername = !username.trimmingCharacters(in: .whitespaces).isEmpty
    return hasEmail && hasUsername && hasPassword
  }

  private func submit() {
    let trimmedEmail = email.trimmingCharacters(in: .whitespaces)
    guard !trimmedEmail.isEmpty, !password.isEmpty else { return }

    if !isLoginMode {
      if password != confirmPassword {
        viewModel.lastError = "Wachtwoorden komen niet overeen."
        return
      }
      if username.trimmingCharacters(in: .whitespaces).count < 3 {
        viewModel.lastError = "Gebruikersnaam moet minimaal 3 tekens zijn."
        return
      }
    }

    isLoading = true
    viewModel.lastError = nil

    Task {
      if isLoginMode {
        // Login: veld kan email of username zijn
        await viewModel.loginWithCredentials(username: trimmedEmail, password: password)
        // Na login: check of onboarding nodig is
        if viewModel.needsOnboarding {
          showOnboarding = true
          onboardingStep = 0
        }
      } else {
        let trimmedUsername = username.trimmingCharacters(in: .whitespaces)
        await viewModel.registerWithCredentials(
          username: trimmedUsername,
          password: password,
          email: trimmedEmail
        )
        if viewModel.lastError == nil {
          showOnboarding = true
          onboardingStep = 0
        }
      }
      isLoading = false
    }
  }

  // MARK: - Onboarding Steps

  private var onboardingContent: some View {
    Group {
      switch onboardingStep {
      case 0:
        onboardingProfileStep
      case 1:
        onboardingKcalStep
      default:
        onboardingCompleteStep
      }
    }
  }

  // Step 1: Profiel
  private var onboardingProfileStep: some View {
    Form {
      Section {
        VStack(alignment: .leading, spacing: 6) {
          Text("Over jou")
            .font(.headline)
          Text("Vul je gegevens in zodat we je een persoonlijk kcal-advies kunnen geven.")
            .font(.subheadline)
            .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
      }

      Section("Persoonlijk") {
        TextField("Weergavenaam", text: $displayName)
          .textContentType(.name)

        TextField("Geboortejaar", text: $birthYear)
          .keyboardType(.numberPad)

        Picker("Geslacht", selection: $gender) {
          ForEach(genderOptions, id: \.0) { value, label in
            Text(label).tag(value)
          }
        }
      }

      Section("Lichaamsgegevens") {
        HStack {
          TextField("Gewicht", text: $weightKg)
            .keyboardType(.decimalPad)
          Text("kg")
            .foregroundColor(.secondary)
        }

        HStack {
          TextField("Lengte", text: $heightCm)
            .keyboardType(.decimalPad)
          Text("cm")
            .foregroundColor(.secondary)
        }
      }

      Section("Activiteitsniveau") {
        Picker("Activiteit", selection: $activityLevel) {
          ForEach(activityOptions, id: \.0) { value, label in
            Text(label).tag(value)
          }
        }
        .pickerStyle(.menu)
      }

      Section {
        HStack {
          Button("Overslaan") {
            onboardingStep = 1
          }
          .foregroundColor(.secondary)

          Spacer()

          Button {
            saveProfileAndContinue()
          } label: {
            Text("Volgende")
              .bold()
          }
        }
      }
    }
  }

  private func saveProfileAndContinue() {
    isLoading = true
    Task {
      let profile = ProfileUpdateRequest(
        displayName: displayName.isEmpty ? nil : displayName,
        birthYear: Int(birthYear),
        gender: gender,
        weightKg: Double(weightKg),
        heightCm: Double(heightCm),
        activityLevel: activityLevel
      )
      await viewModel.updateUserProfile(profile)

      // Vraag BMR suggestie op
      await viewModel.fetchSuggestedKcal(
        birthYear: Int(birthYear),
        gender: gender,
        weightKg: Double(weightKg),
        heightCm: Double(heightCm),
        activityLevel: activityLevel
      )
      if let suggested = viewModel.suggestedKcal {
        selectedKcal = suggested
      }

      isLoading = false
      onboardingStep = 1
    }
  }

  // Step 2: Kcal keuze
  private var onboardingKcalStep: some View {
    Form {
      Section {
        VStack(alignment: .leading, spacing: 6) {
          Text("Dagelijks kcal-doel")
            .font(.headline)
          Text("Kies hoeveel kilocalorieën je per dag wilt eten. We passen je weekmenu hierop aan.")
            .font(.subheadline)
            .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
      }

      if let suggested = viewModel.suggestedKcal {
        Section {
          HStack {
            Image(systemName: "sparkles")
              .foregroundColor(.orange)
            VStack(alignment: .leading) {
              Text("Persoonlijk advies")
                .font(.subheadline)
                .bold()
              Text("Op basis van je profiel raden we \(suggested) kcal/dag aan.")
                .font(.caption)
                .foregroundColor(.secondary)
            }
          }
          .padding(.vertical, 4)

          Button {
            selectedKcal = suggested
          } label: {
            HStack {
              Text("\(suggested) kcal")
                .bold()
              Spacer()
              if selectedKcal == suggested {
                Image(systemName: "checkmark.circle.fill")
                  .foregroundColor(.green)
              }
            }
          }
        }
      }

      Section("Of kies een vast niveau") {
        ForEach(viewModel.fixedKcals, id: \.self) { kcal in
          Button {
            selectedKcal = kcal
          } label: {
            HStack {
              Text("\(kcal) kcal")
              Spacer()
              if selectedKcal == kcal {
                Image(systemName: "checkmark.circle.fill")
                  .foregroundColor(.green)
              }
            }
          }
          .foregroundColor(.primary)
        }
      }

      Section {
        HStack {
          Button("Terug") {
            onboardingStep = 0
          }
          .foregroundColor(.secondary)

          Spacer()

          Button {
            finishOnboarding()
          } label: {
            Text("Afronden")
              .bold()
          }
        }
      }
    }
  }

  private func finishOnboarding() {
    isLoading = true
    Task {
      // Sla kcal keuze op in profiel
      await viewModel.updateUserProfile(ProfileUpdateRequest(kcalGoal: selectedKcal))

      // Pas weekplanselectie aan op gekozen kcal
      viewModel.selection.kcal = selectedKcal

      // Markeer onboarding als afgerond
      await viewModel.completeOnboardingFlow()

      showOnboarding = false
      isLoading = false
    }
  }

  // Step 3: Klaar
  private var onboardingCompleteStep: some View {
    VStack(spacing: 24) {
      Spacer()
      Image(systemName: "checkmark.seal.fill")
        .font(.system(size: 64))
        .foregroundColor(.green)
      Text("Welkom bij MenuFit!")
        .font(.title)
        .bold()
      Text("Je account is ingesteld. Geniet van je persoonlijke weekmenu's.")
        .font(.body)
        .foregroundColor(.secondary)
        .multilineTextAlignment(.center)
        .padding(.horizontal, 32)
      Spacer()
      Button {
        showOnboarding = false
        Task { await viewModel.completeOnboardingFlow() }
      } label: {
        Text("Aan de slag!")
          .bold()
          .frame(maxWidth: .infinity)
      }
      .buttonStyle(.borderedProminent)
      .padding(.horizontal, 32)
      .padding(.bottom, 40)
    }
  }
}
