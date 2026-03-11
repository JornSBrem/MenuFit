import SwiftUI

// MARK: - Main Auth / Onboarding View

struct AuthSessionSetupView: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  @State private var isLoginMode = true
  @State private var email = ""
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
      .navigationBarTitleDisplayMode(.inline)
    }
  }

  // MARK: - Login / Register Form

  private var authContent: some View {
    ScrollView {
      VStack(spacing: 0) {

        // ── Brand header ──────────────────────────────────
        VStack(spacing: 8) {
          Image(systemName: "fork.knife.circle.fill")
            .font(.system(size: 64))
            .foregroundStyle(MFColors.brandGradient)
          Text("MenuFit")
            .font(.largeTitle.bold())
            .foregroundStyle(MFColors.brandGradient)
          Text(isLoginMode ? "Welkom terug" : "Account aanmaken")
            .font(.subheadline)
            .foregroundColor(.secondary)
        }
        .padding(.top, 40)
        .padding(.bottom, 28)

        // ── Mode toggle ──────────────────────────────────
        Picker("", selection: $isLoginMode) {
          Text("Inloggen").tag(true)
          Text("Registreren").tag(false)
        }
        .pickerStyle(.segmented)
        .padding(.horizontal, 24)
        .padding(.bottom, 20)

        // ── Fields ───────────────────────────────────────
        VStack(spacing: 12) {
          authField(icon: "envelope.fill", placeholder: "E-mailadres", text: $email,
                    contentType: .emailAddress, keyboard: .emailAddress,
                    accessibilityId: "auth-email-field")

          authField(icon: "lock.fill", placeholder: "Wachtwoord", text: $password,
                    isSecure: true, contentType: isLoginMode ? .password : .newPassword,
                    accessibilityId: "auth-password-field")

          if !isLoginMode {
            authField(icon: "lock.rotation", placeholder: "Bevestig wachtwoord", text: $confirmPassword,
                      isSecure: true, contentType: .newPassword,
                      accessibilityId: "auth-confirm-password-field")
          }
        }
        .padding(.horizontal, 24)

        // ── Submit ───────────────────────────────────────
        Button {
          submit()
        } label: {
          if isLoading {
            ProgressView()
              .tint(.white)
          } else {
            Text(isLoginMode ? "Inloggen" : "Account aanmaken")
          }
        }
        .buttonStyle(.mfPrimary)
        .disabled(isLoading || !isFormValid)
        .padding(.horizontal, 24)
        .padding(.top, 20)
        .accessibilityIdentifier("auth-submit-button")

        // ── Error ────────────────────────────────────────
        if let lastError = viewModel.lastError {
          Text(lastError)
            .foregroundColor(MFColors.error)
            .font(.footnote)
            .padding(.horizontal, 24)
            .padding(.top, 12)
        }

        if viewModel.authGateState == .expired {
          Button("Sessie wissen", role: .destructive) {
            viewModel.clearAuthSession()
          }
          .padding(.top, 12)
        }

        Spacer(minLength: 60)
      }
    }
    .background(Color(.systemGroupedBackground))
    .onChange(of: isLoginMode) { _, _ in
      viewModel.lastError = nil
      confirmPassword = ""
    }
  }

  private func authField(icon: String, placeholder: String, text: Binding<String>,
                          isSecure: Bool = false, contentType: UITextContentType? = nil,
                          keyboard: UIKeyboardType = .default, accessibilityId: String = "") -> some View {
    HStack(spacing: 12) {
      Image(systemName: icon)
        .foregroundColor(MFColors.accent)
        .font(.subheadline)
        .frame(width: 20)
      Group {
        if isSecure {
          SecureField(placeholder, text: text)
        } else {
          TextField(placeholder, text: text)
        }
      }
      .textInputAutocapitalization(.never)
      .autocorrectionDisabled(true)
      .textContentType(contentType)
      .keyboardType(keyboard)
      .accessibilityIdentifier(accessibilityId)
    }
    .padding(14)
    .background(
      RoundedRectangle(cornerRadius: 12, style: .continuous)
        .fill(Color(.secondarySystemGroupedBackground))
    )
  }

  private var isFormValid: Bool {
    let hasEmail = !email.trimmingCharacters(in: .whitespaces).isEmpty
    let hasPassword = password.count >= 6
    return hasEmail && hasPassword
  }

  private func submit() {
    let trimmedEmail = email.trimmingCharacters(in: .whitespaces)
    guard !trimmedEmail.isEmpty, !password.isEmpty else { return }

    if !isLoginMode {
      if password != confirmPassword {
        viewModel.lastError = "Wachtwoorden komen niet overeen."
        return
      }
      if password.count < 6 {
        viewModel.lastError = "Wachtwoord moet minimaal 6 tekens zijn."
        return
      }
    }

    isLoading = true
    viewModel.lastError = nil

    Task {
      if isLoginMode {
        await viewModel.loginWithCredentials(email: trimmedEmail, password: password)
        if viewModel.needsOnboarding {
          showOnboarding = true
          onboardingStep = 0
        }
      } else {
        await viewModel.registerWithCredentials(email: trimmedEmail, password: password)
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
    ScrollView {
      VStack(spacing: 0) {
        MFGradientHeader(title: "Over jou", subtitle: "Vul je gegevens in voor een persoonlijk kcal-advies.")
          .padding(.top, 12)

        VStack(spacing: 16) {
          // Persoonlijk
          VStack(alignment: .leading, spacing: 10) {
            MFSectionHeader(title: "Persoonlijk", icon: "person")
            VStack(spacing: 10) {
              TextField("Weergavenaam", text: $displayName)
                .textContentType(.name)
                .padding(12)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
              TextField("Geboortejaar", text: $birthYear)
                .keyboardType(.numberPad)
                .padding(12)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
              Picker("Geslacht", selection: $gender) {
                ForEach(genderOptions, id: \.0) { value, label in
                  Text(label).tag(value)
                }
              }
              .pickerStyle(.segmented)
            }
            .padding(.horizontal, 20)
          }

          // Lichaamsgegevens
          VStack(alignment: .leading, spacing: 10) {
            MFSectionHeader(title: "Lichaamsgegevens", icon: "figure.stand")
            HStack(spacing: 10) {
              HStack {
                TextField("Gewicht", text: $weightKg)
                  .keyboardType(.decimalPad)
                Text("kg").foregroundColor(.secondary).font(.subheadline)
              }
              .padding(12)
              .background(Color(.secondarySystemGroupedBackground))
              .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

              HStack {
                TextField("Lengte", text: $heightCm)
                  .keyboardType(.decimalPad)
                Text("cm").foregroundColor(.secondary).font(.subheadline)
              }
              .padding(12)
              .background(Color(.secondarySystemGroupedBackground))
              .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .padding(.horizontal, 20)
          }

          // Activiteitsniveau
          VStack(alignment: .leading, spacing: 10) {
            MFSectionHeader(title: "Activiteitsniveau", icon: "figure.run")
            Picker("Activiteit", selection: $activityLevel) {
              ForEach(activityOptions, id: \.0) { value, label in
                Text(label).tag(value)
              }
            }
            .pickerStyle(.menu)
            .padding(.horizontal, 20)
          }

          // Navigatie
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
            }
            .buttonStyle(.mfPrimary)
            .frame(width: 160)
          }
          .padding(.horizontal, 24)
          .padding(.top, 8)
        }
        .padding(.top, 8)

        Spacer(minLength: 40)
      }
    }
    .background(Color(.systemGroupedBackground))
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
    ScrollView {
      VStack(spacing: 0) {
        MFGradientHeader(title: "Dagelijks kcal-doel", subtitle: "Kies hoeveel kilocalorieën je per dag wilt eten.")
          .padding(.top, 12)

        VStack(spacing: 16) {
          // Persoonlijk advies
          if let suggested = viewModel.suggestedKcal {
            Button {
              withAnimation(.snappy) { selectedKcal = suggested }
            } label: {
              HStack(spacing: 12) {
                Image(systemName: "sparkles")
                  .font(.title3)
                  .foregroundStyle(MFColors.brandGradient)
                VStack(alignment: .leading, spacing: 2) {
                  Text("Persoonlijk advies")
                    .font(.subheadline.bold())
                    .foregroundColor(.primary)
                  Text("\(suggested) kcal/dag op basis van je profiel")
                    .font(.caption)
                    .foregroundColor(.secondary)
                }
                Spacer()
                if selectedKcal == suggested {
                  Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(MFColors.success)
                    .font(.title3)
                }
              }
              .mfCard(padding: 14, cornerRadius: 14)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 16)
          }

          // Vaste niveaus
          VStack(alignment: .leading, spacing: 10) {
            MFSectionHeader(title: "Kies een niveau", icon: "flame")
            VStack(spacing: 6) {
              ForEach(viewModel.fixedKcals, id: \.self) { kcal in
                let selected = selectedKcal == kcal
                Button {
                  withAnimation(.snappy) { selectedKcal = kcal }
                } label: {
                  HStack {
                    Text("\(kcal) kcal")
                      .font(.subheadline.weight(selected ? .bold : .regular))
                      .foregroundColor(.primary)
                    Spacer()
                    if selected {
                      Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(MFColors.success)
                    }
                  }
                  .mfCard(padding: 14, cornerRadius: 12)
                  .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                      .strokeBorder(selected ? MFColors.accent : .clear, lineWidth: 2)
                  )
                }
                .buttonStyle(.plain)
              }
            }
            .padding(.horizontal, 16)
          }

          // Navigatie
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
            }
            .buttonStyle(.mfPrimary)
            .frame(width: 160)
          }
          .padding(.horizontal, 24)
          .padding(.top, 8)
        }
        .padding(.top, 8)

        Spacer(minLength: 40)
      }
    }
    .background(Color(.systemGroupedBackground))
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
        .font(.system(size: 72))
        .foregroundStyle(MFColors.brandGradient)
      Text("Welkom bij MenuFit!")
        .font(.largeTitle.bold())
        .foregroundStyle(MFColors.brandGradient)
      Text("Je account is ingesteld.\nGeniet van je persoonlijke weekmenu's.")
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
      }
      .buttonStyle(.mfPrimary)
      .padding(.horizontal, 32)
      .padding(.bottom, 48)
    }
    .background(Color(.systemGroupedBackground))
  }
}
