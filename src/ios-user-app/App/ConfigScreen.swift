import SwiftUI

struct ConfigScreen: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  @State private var joinCode = ""
  @State private var picnicEmail = ""
  @State private var picnicPassword = ""
  @State private var showInviteCode = false

  var body: some View {
    NavigationView {
      Form {

        // MARK: Dieet
        Section {
          VStack(alignment: .leading, spacing: 10) {
            Text("Dagelijkse kcal-behoefte")
              .font(.subheadline)
            HStack(spacing: 8) {
              ForEach(viewModel.fixedKcals, id: \.self) { kcal in
                let selected = viewModel.selection.kcal == kcal
                Button("\(kcal)") {
                  viewModel.setPreferredKcal(kcal)
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(selected ? Color.blue : Color(.systemGray5))
                .foregroundColor(selected ? .white : .primary)
                .cornerRadius(8)
                .font(.subheadline.weight(selected ? .semibold : .regular))
              }
            }
          }
          .padding(.vertical, 4)
        } header: {
          Text("Dieet")
        } footer: {
          Text("Stel je dagelijkse caloriebehoefte in. Dit wordt opgeslagen en bij elke start gebruikt.")
            .font(.caption)
            .foregroundColor(.secondary)
        }

        // MARK: Account
        Section("Account") {
          if let session = viewModel.authSession {
            HStack {
              Label(session.username ?? session.subjectId, systemImage: "person.circle")
              Spacer()
              Text("Ingelogd")
                .font(.caption)
                .foregroundColor(.green)
            }
          }

          Button(role: .destructive) {
            viewModel.clearAuthSession()
          } label: {
            Label("Uitloggen", systemImage: "rectangle.portrait.and.arrow.right")
          }
        }

        // MARK: Gezin
        Section {
          if let household = viewModel.configHousehold {
            // Na aanmaken: toon inviteCode
            VStack(alignment: .leading, spacing: 8) {
              Text("Gezin aangemaakt")
                .font(.headline)
              Text("Deel deze code met familieleden:")
                .font(.subheadline)
                .foregroundColor(.secondary)

              if let code = household.inviteCode {
                HStack {
                  Text(code)
                    .font(.system(.title2, design: .monospaced))
                    .bold()
                    .foregroundColor(.orange)
                  Spacer()
                  Button {
                    UIPasteboard.general.string = code
                  } label: {
                    Image(systemName: "doc.on.doc")
                  }
                }
                .padding(.vertical, 4)
              }
            }
          } else {
            Button {
              Task { await viewModel.createNewHousehold() }
            } label: {
              Label("Gezin aanmaken", systemImage: "house.badge.plus")
            }
            .disabled(viewModel.isConfigLoading)
          }
        } header: {
          Text("Gezin")
        } footer: {
          if let msg = viewModel.configMessage {
            Text(msg)
              .foregroundColor(.green)
          }
        }

        Section("Koppel aan gezin") {
          TextField("Gezinscode (bijv. A1B2C3D4)", text: $joinCode)
            .textInputAutocapitalization(.characters)
            .autocorrectionDisabled(true)

          Button {
            let code = joinCode.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !code.isEmpty else { return }
            Task { await viewModel.joinHouseholdByCode(code) }
          } label: {
            Label("Koppelen", systemImage: "link")
          }
          .disabled(viewModel.isConfigLoading || joinCode.trimmingCharacters(in: .whitespaces).isEmpty)
        }

        // MARK: Picnic integratie
        Section {
          Toggle("Picnic integratie", isOn: Binding(
            get: { viewModel.picnicEnabled },
            set: { viewModel.setPicnicEnabled($0) }
          ))
        } header: {
          Text("Picnic")
        } footer: {
          Text("Schakel in om de Bestellen en Match tabs te activeren.")
            .font(.caption)
            .foregroundColor(.secondary)
        }

        if viewModel.picnicEnabled {
          // MARK: Picnic koppeling
          Section {
            TextField("E-mailadres", text: $picnicEmail)
              .textInputAutocapitalization(.never)
              .autocorrectionDisabled(true)
              .keyboardType(.emailAddress)

            SecureField("Wachtwoord", text: $picnicPassword)
              .textInputAutocapitalization(.never)
              .autocorrectionDisabled(true)

            Button {
              // Picnic linking — toekomstige implementatie
              viewModel.configMessage = "Picnic koppeling is nog niet beschikbaar in deze versie."
            } label: {
              Label("Koppelen met Picnic", systemImage: "cart.badge.plus")
            }
            .disabled(picnicEmail.isEmpty || picnicPassword.isEmpty || viewModel.isConfigLoading)
          } header: {
            Text("Picnic koppeling")
          } footer: {
            Text("Voer je Picnic inloggegevens in om boodschappen automatisch te synchroniseren.")
              .font(.caption)
              .foregroundColor(.secondary)
          }
        }

        // MARK: Fout
        if let lastError = viewModel.lastError {
          Section {
            Text(lastError)
              .foregroundColor(.red)
              .font(.footnote)
          }
        }

        // MARK: Loading indicator
        if viewModel.isConfigLoading {
          Section {
            HStack {
              Spacer()
              ProgressView()
              Spacer()
            }
          }
        }
      }
      .navigationTitle("Instellingen")
    }
  }
}
