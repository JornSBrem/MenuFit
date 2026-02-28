import SwiftUI

struct ProfileEditSheet: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel
  @Environment(\.dismiss) private var dismiss

  @State private var displayName = ""
  @State private var birthYear = ""
  @State private var gender = "male"
  @State private var weightKg = ""
  @State private var heightCm = ""
  @State private var activityLevel = "moderate"
  @State private var kcalGoal = ""
  @State private var isSaving = false

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
      Form {
        Section {
          TextField("Weergavenaam", text: $displayName)
            .textContentType(.name)

          TextField("Geboortejaar", text: $birthYear)
            .keyboardType(.numberPad)

          Picker("Geslacht", selection: $gender) {
            ForEach(genderOptions, id: \.0) { value, label in
              Text(label).tag(value)
            }
          }
        } header: {
          Label("Persoonlijk", systemImage: "person")
        }

        Section {
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
        } header: {
          Label("Lichaamsgegevens", systemImage: "figure.stand")
        }

        Section {
          Picker("Activiteit", selection: $activityLevel) {
            ForEach(activityOptions, id: \.0) { value, label in
              Text(label).tag(value)
            }
          }
          .pickerStyle(.menu)
        } header: {
          Label("Activiteitsniveau", systemImage: "figure.run")
        }

        Section {
          HStack {
            TextField("Kcal per dag", text: $kcalGoal)
              .keyboardType(.numberPad)
            Text("kcal")
              .foregroundColor(.secondary)
          }

          Button {
            Task { await requestSuggestion() }
          } label: {
            HStack {
              Image(systemName: "sparkles")
                .foregroundStyle(MFColors.brandGradient)
              Text("Bereken advies")
                .foregroundColor(MFColors.accent)
            }
          }

          if let suggested = viewModel.suggestedKcal {
            HStack {
              MFKcalBadge(kcal: suggested)
              Text("advies/dag")
                .font(.caption).foregroundColor(.secondary)
              Spacer()
              Button("Overnemen") {
                withAnimation(.snappy) { kcalGoal = "\(suggested)" }
              }
              .font(.subheadline.bold())
              .foregroundColor(MFColors.accent)
            }
          }
        } header: {
          Label("Kcal-doel", systemImage: "flame")
        }

        if let error = viewModel.lastError {
          Section {
            Text(error)
              .foregroundColor(MFColors.error)
              .font(.footnote)
          }
        }
      }
      .navigationTitle("Profiel bewerken")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Annuleer") { dismiss() }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("Opslaan") {
            Task { await save() }
          }
          .disabled(isSaving)
          .bold()
          .foregroundColor(MFColors.accent)
        }
      }
      .onAppear { loadExisting() }
    }
  }

  private func loadExisting() {
    guard let profile = viewModel.userProfile else { return }
    displayName = profile.displayName ?? ""
    if let y = profile.birthYear { birthYear = "\(y)" }
    gender = profile.gender ?? "male"
    if let w = profile.weightKg { weightKg = "\(Int(w))" }
    if let h = profile.heightCm { heightCm = "\(Int(h))" }
    activityLevel = profile.activityLevel ?? "moderate"
    if let k = profile.kcalGoal { kcalGoal = "\(k)" }
  }

  private func requestSuggestion() async {
    await viewModel.fetchSuggestedKcal(
      birthYear: Int(birthYear),
      gender: gender,
      weightKg: Double(weightKg),
      heightCm: Double(heightCm),
      activityLevel: activityLevel
    )
  }

  private func save() async {
    isSaving = true
    let update = ProfileUpdateRequest(
      displayName: displayName.isEmpty ? nil : displayName,
      birthYear: Int(birthYear),
      gender: gender,
      weightKg: Double(weightKg),
      heightCm: Double(heightCm),
      activityLevel: activityLevel,
      kcalGoal: Int(kcalGoal)
    )
    await viewModel.updateUserProfile(update)

    // Pas weekplan kcal aan als kcalGoal is ingesteld
    if let k = Int(kcalGoal), k > 0 {
      viewModel.selection.kcal = k
    }

    isSaving = false
    dismiss()
  }
}
