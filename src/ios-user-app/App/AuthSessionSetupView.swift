import SwiftUI

struct AuthSessionSetupView: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  @State private var isLoginMode = true
  @State private var username = ""
  @State private var password = ""
  @State private var confirmPassword = ""
  @State private var isLoading = false

  var body: some View {
    NavigationView {
      Form {
        // Header
        Section {
          VStack(alignment: .leading, spacing: 6) {
            Text(isLoginMode ? "Welkom terug" : "Account aanmaken")
              .font(.headline)
            Text(isLoginMode
              ? "Log in met je gebruikersnaam en wachtwoord."
              : "Maak een nieuw account aan om MenuFit te gebruiken."
            )
            .font(.subheadline)
            .foregroundColor(.secondary)
          }
          .padding(.vertical, 4)
        }

        // Mode toggle
        Section {
          Picker("", selection: $isLoginMode) {
            Text("Inloggen").tag(true)
            Text("Registreren").tag(false)
          }
          .pickerStyle(.segmented)
        }

        // Credentials
        Section("Inloggegevens") {
          TextField("Gebruikersnaam", text: $username)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled(true)
            .textContentType(.username)
            .accessibilityIdentifier("auth-username-field")

          SecureField("Wachtwoord", text: $password)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled(true)
            .textContentType(.password)
            .accessibilityIdentifier("auth-password-field")

          if !isLoginMode {
            SecureField("Bevestig wachtwoord", text: $confirmPassword)
              .textInputAutocapitalization(.never)
              .autocorrectionDisabled(true)
              .textContentType(.password)
              .accessibilityIdentifier("auth-confirm-password-field")
          }
        }

        // Submit
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
          .disabled(isLoading || username.trimmingCharacters(in: .whitespaces).isEmpty || password.isEmpty)
          .accessibilityIdentifier("auth-submit-button")
        }

        // Error
        if let lastError = viewModel.lastError {
          Section {
            Text(lastError)
              .foregroundColor(.red)
              .font(.footnote)
          }
        }

        // Session expired: toon extra uitlog-knop
        if viewModel.authGateState == .expired {
          Section {
            Button("Sessie wissen", role: .destructive) {
              viewModel.clearAuthSession()
            }
          }
        }
      }
      .navigationTitle("MenuFit")
      .navigationBarTitleDisplayMode(.inline)
    }
    .onChange(of: isLoginMode) { _ in
      viewModel.lastError = nil
      confirmPassword = ""
    }
  }

  private func submit() {
    let trimmedUsername = username.trimmingCharacters(in: .whitespaces)
    guard !trimmedUsername.isEmpty, !password.isEmpty else { return }

    if !isLoginMode, password != confirmPassword {
      viewModel.lastError = "Wachtwoorden komen niet overeen."
      return
    }

    isLoading = true
    viewModel.lastError = nil

    Task {
      if isLoginMode {
        await viewModel.loginWithCredentials(username: trimmedUsername, password: password)
      } else {
        await viewModel.registerWithCredentials(username: trimmedUsername, password: password)
      }
      isLoading = false
    }
  }
}
