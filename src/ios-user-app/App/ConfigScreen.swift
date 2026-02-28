import SwiftUI

struct ConfigScreen: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel

  @State private var joinCode = ""
  @State private var picnicEmail = ""
  @State private var picnicPassword = ""
  @State private var showInviteCode = false
  @State private var householdName = ""
  @State private var isEditingName = false
  @State private var showDeleteAccountAlert = false
  @State private var showLeaveAlert = false
  @State private var memberToRemove: HouseholdMember?
  @State private var showProfileEdit = false

  var body: some View {
    NavigationView {
      Form {

        // MARK: Dieet
        Section {
          VStack(alignment: .leading, spacing: 12) {
            Label("Dagelijkse kcal-behoefte", systemImage: "flame.fill")
              .font(.subheadline.weight(.medium))
              .foregroundColor(MFColors.accent)

            HStack(spacing: 8) {
              ForEach(viewModel.fixedKcals, id: \.self) { kcal in
                let selected = viewModel.selection.kcal == kcal
                Button("\(kcal)") {
                  withAnimation(.snappy) { viewModel.setPreferredKcal(kcal) }
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(
                  RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(selected ? MFColors.accent : Color(.systemGray5))
                )
                .foregroundColor(selected ? .white : .primary)
                .font(.subheadline.weight(selected ? .bold : .regular))
              }
            }
          }
          .padding(.vertical, 4)
        } header: {
          Label("Dieet", systemImage: "leaf")
        } footer: {
          Text("Stel je dagelijkse caloriebehoefte in. Dit wordt opgeslagen en bij elke start gebruikt.")
        }

        // MARK: Account
        Section {
          if let session = viewModel.authSession {
            HStack {
              Image(systemName: "person.circle.fill")
                .font(.title2)
                .foregroundStyle(MFColors.brandGradient)
              VStack(alignment: .leading, spacing: 2) {
                Text(session.username ?? session.subjectId)
                  .font(.subheadline.weight(.medium))
                Text("Ingelogd")
                  .font(.caption)
                  .foregroundColor(MFColors.success)
              }
              Spacer()
              Circle()
                .fill(MFColors.success)
                .frame(width: 8, height: 8)
            }
          }

          Button(role: .destructive) {
            viewModel.clearAuthSession()
          } label: {
            Label("Uitloggen", systemImage: "rectangle.portrait.and.arrow.right")
          }

          Button(role: .destructive) {
            showDeleteAccountAlert = true
          } label: {
            Label("Account verwijderen", systemImage: "trash")
          }
          .alert("Account verwijderen", isPresented: $showDeleteAccountAlert) {
            Button("Verwijderen", role: .destructive) {
              Task { await viewModel.deleteAccount() }
            }
            Button("Annuleer", role: .cancel) {}
          } message: {
            Text("Weet je zeker dat je je account permanent wilt verwijderen? Dit kan niet ongedaan worden gemaakt.")
          }
        } header: {
          Label("Account", systemImage: "person.crop.circle")
        }

        // MARK: Profiel
        Section {
          if let profile = viewModel.userProfile {
            if let name = profile.displayName, !name.isEmpty {
              HStack {
                Label("Naam", systemImage: "person")
                Spacer()
                Text(name).foregroundColor(.secondary)
              }
            }
            if let year = profile.birthYear {
              HStack {
                Label("Geboortejaar", systemImage: "calendar")
                Spacer()
                Text("\(year)").foregroundColor(.secondary)
              }
            }
            if let w = profile.weightKg {
              HStack {
                Label("Gewicht", systemImage: "scalemass")
                Spacer()
                Text("\(Int(w)) kg").foregroundColor(.secondary)
              }
            }
            if let h = profile.heightCm {
              HStack {
                Label("Lengte", systemImage: "ruler")
                Spacer()
                Text("\(Int(h)) cm").foregroundColor(.secondary)
              }
            }
            if let kcal = profile.kcalGoal {
              HStack {
                Label("Kcal-doel", systemImage: "flame")
                Spacer()
                MFKcalBadge(kcal: kcal)
              }
            }
          } else {
            Text("Nog geen profielgegevens ingesteld.")
              .font(.subheadline)
              .foregroundColor(.secondary)
          }

          Button {
            showProfileEdit = true
          } label: {
            Label("Profiel bewerken", systemImage: "pencil.circle")
              .foregroundColor(MFColors.accent)
          }
          .sheet(isPresented: $showProfileEdit) {
            ProfileEditSheet()
              .environmentObject(viewModel)
          }
        } header: {
          Label("Profiel", systemImage: "person.text.rectangle")
        }

        // MARK: Gezin
        Section {
          if let household = viewModel.configHouseholdRecord {
            // Gezinsnaam (bewerkbaar door head)
            let isHead = household.members.first(where: { $0.userId == viewModel.authSession?.subjectId })?.role == "head"

            VStack(alignment: .leading, spacing: 8) {
              if isEditingName {
                HStack {
                  TextField("Gezinsnaam", text: $householdName)
                    .textFieldStyle(.roundedBorder)
                  Button("Opslaan") {
                    Task {
                      await viewModel.renameHousehold(householdName)
                      isEditingName = false
                    }
                  }
                  .buttonStyle(.borderedProminent)
                  .disabled(viewModel.isConfigLoading)
                }
              } else {
                HStack {
                  VStack(alignment: .leading, spacing: 2) {
                    Text(household.name ?? "Mijn gezin")
                      .font(.headline)
                    Text("\(household.members.count) lid\(household.members.count == 1 ? "" : "en")")
                      .font(.caption)
                      .foregroundColor(.secondary)
                  }
                  Spacer()
                  if isHead {
                    Button {
                      householdName = household.name ?? ""
                      isEditingName = true
                    } label: {
                      Image(systemName: "pencil")
                    }
                    .buttonStyle(.bordered)
                  }
                }
              }
            }
            .padding(.vertical, 4)

            // Ledenlijst
            ForEach(household.members) { member in
              HStack(spacing: 10) {
                Image(systemName: member.role == "head" ? "crown.fill" : "person.fill")
                  .foregroundColor(member.role == "head" ? MFColors.accent : .secondary)
                  .font(.subheadline)
                VStack(alignment: .leading, spacing: 2) {
                  Text(member.displayName ?? member.userId)
                    .font(.subheadline.weight(.medium))
                  HStack(spacing: 8) {
                    Text(member.role == "head" ? "Gezinshoofd" : "Lid")
                      .font(.caption)
                      .foregroundColor(.secondary)
                    if let kcal = member.kcalPreference {
                      MFPill(text: "\(kcal) kcal", color: MFColors.info)
                    }
                  }
                }
                Spacer()
                if member.userId == viewModel.authSession?.subjectId {
                  MFPill(text: "Jij", color: MFColors.success)
                }
              }
              .padding(.vertical, 2)
              .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                if isHead && member.userId != viewModel.authSession?.subjectId {
                  Button(role: .destructive) {
                    memberToRemove = member
                  } label: {
                    Label("Verwijder", systemImage: "trash")
                  }
                }
              }
            }
            .alert("Lid verwijderen", isPresented: Binding(
              get: { memberToRemove != nil },
              set: { if !$0 { memberToRemove = nil } }
            )) {
              Button("Verwijderen", role: .destructive) {
                if let member = memberToRemove {
                  Task { await viewModel.removeMember(userId: member.userId) }
                  memberToRemove = nil
                }
              }
              Button("Annuleer", role: .cancel) { memberToRemove = nil }
            } message: {
              Text("Weet je zeker dat je \(memberToRemove?.displayName ?? memberToRemove?.userId ?? "dit lid") wilt verwijderen uit het gezin?")
            }

            // Gezin verlaten (voor niet-hoofd leden)
            if !isHead {
              Button(role: .destructive) {
                showLeaveAlert = true
              } label: {
                Label("Gezin verlaten", systemImage: "figure.walk.departure")
              }
              .alert("Gezin verlaten", isPresented: $showLeaveAlert) {
                Button("Verlaten", role: .destructive) {
                  Task { await viewModel.leaveHousehold() }
                }
                Button("Annuleer", role: .cancel) {}
              } message: {
                Text("Weet je zeker dat je dit gezin wilt verlaten?")
              }
            }

            // Uitnodigingscode
            if let code = household.inviteCode, isHead {
              Divider()
              HStack {
                VStack(alignment: .leading, spacing: 4) {
                  Text("Uitnodigingscode")
                    .font(.caption)
                    .foregroundColor(.secondary)
                  Text(code)
                    .font(.system(.title3, design: .monospaced))
                    .bold()
                    .foregroundStyle(MFColors.brandGradient)
                }
                Spacer()
                Button {
                  UIPasteboard.general.string = code
                } label: {
                  Image(systemName: "doc.on.doc.fill")
                    .foregroundColor(MFColors.accent)
                }
              }
              .padding(.vertical, 4)
            }
          } else if viewModel.configHousehold != nil {
            // Zojuist aangemaakt maar record nog niet geladen
            VStack(alignment: .leading, spacing: 8) {
              Text("Gezin aangemaakt")
                .font(.headline)
              Text("Deel deze code met familieleden:")
                .font(.subheadline)
                .foregroundColor(.secondary)

              if let code = viewModel.configHousehold?.inviteCode {
                HStack {
                  Text(code)
                    .font(.system(.title2, design: .monospaced))
                    .bold()
                    .foregroundStyle(MFColors.brandGradient)
                  Spacer()
                  Button {
                    UIPasteboard.general.string = code
                  } label: {
                    Image(systemName: "doc.on.doc.fill")
                      .foregroundColor(MFColors.accent)
                  }
                }
                .padding(.vertical, 4)
              }
            }
          } else {
            Button {
              Task {
                await viewModel.createNewHousehold()
                await viewModel.loadHouseholdStatus()
              }
            } label: {
              Label("Gezin aanmaken", systemImage: "house.badge.plus")
            }
            .disabled(viewModel.isConfigLoading)
          }
        } header: {
          Label("Gezin", systemImage: "house")
        } footer: {
          if let msg = viewModel.configMessage {
            Text(msg)
              .foregroundColor(.green)
          }
        }

        Section {
          TextField("Gezinscode (bijv. A1B2C3D4)", text: $joinCode)
            .textInputAutocapitalization(.characters)
            .autocorrectionDisabled(true)

          Button {
            let code = joinCode.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !code.isEmpty else { return }
            Task { await viewModel.joinHouseholdByCode(code) }
          } label: {
            Label("Koppelen", systemImage: "link")
              .foregroundColor(MFColors.accent)
          }
          .disabled(viewModel.isConfigLoading || joinCode.trimmingCharacters(in: .whitespaces).isEmpty)
        } header: {
          Label("Koppel aan gezin", systemImage: "link.badge.plus")
        }

        // MARK: Picnic integratie
        Section {
          Toggle("Picnic integratie", isOn: Binding(
            get: { viewModel.picnicEnabled },
            set: { viewModel.setPicnicEnabled($0) }
          ))
        } header: {
          Label("Picnic", systemImage: "cart")
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
            Label("Picnic koppeling", systemImage: "cart.badge.plus")
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
      .navigationBarTitleDisplayMode(.large)
    }
  }
}
