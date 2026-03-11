import SwiftUI

// MARK: - EetmeterDagSheet

/// Sheet die de Eetmeter dagconsumptie toont.
/// Toont een loginformulier als de gebruiker nog niet gekoppeld is.
struct EetmeterDagSheet: View {
  @EnvironmentObject private var viewModel: UserFlowViewModel
  @Environment(\.dismiss) private var dismiss

  @State private var emailInput = ""
  @State private var passwordInput = ""

  var body: some View {
    NavigationView {
      Group {
        if !viewModel.eetmeterIsIngelogd {
          loginView
        } else {
          dagView
        }
      }
      .background(Color(.systemGroupedBackground))
      .navigationTitle("Eetmeter Dagboek")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .navigationBarTrailing) {
          Button { dismiss() } label: {
            Image(systemName: "xmark.circle.fill")
              .foregroundColor(.secondary)
              .font(.title3)
          }
        }
      }
    }
  }

  // MARK: Login view

  private var loginView: some View {
    ScrollView {
      VStack(spacing: 20) {
        // Icoon + uitleg
        VStack(spacing: 10) {
          Image(systemName: "fork.knife.circle.fill")
            .font(.system(size: 60))
            .foregroundColor(.orange)
          Text("Koppel met Eetmeter")
            .font(.title2.bold())
          Text("Voer je Voedingscentrum Eetmeter inloggegevens in om je dagconsumptie te bekijken.")
            .font(.subheadline)
            .foregroundColor(.secondary)
            .multilineTextAlignment(.center)
        }
        .padding(.top, 20)

        // Formulier
        VStack(spacing: 12) {
          VStack(alignment: .leading, spacing: 6) {
            Text("E-mailadres")
              .font(.caption.weight(.semibold))
              .foregroundColor(.secondary)
            TextField("naam@voorbeeld.nl", text: $emailInput)
              .textContentType(.emailAddress)
              .autocapitalization(.none)
              .keyboardType(.emailAddress)
              .textFieldStyle(.roundedBorder)
          }

          VStack(alignment: .leading, spacing: 6) {
            Text("Wachtwoord")
              .font(.caption.weight(.semibold))
              .foregroundColor(.secondary)
            SecureField("••••••••", text: $passwordInput)
              .textContentType(.password)
              .textFieldStyle(.roundedBorder)
          }

          if let err = viewModel.eetmeterError {
            Text(err)
              .font(.caption)
              .foregroundColor(MFColors.error)
              .multilineTextAlignment(.center)
          }

          Button {
            Task { await viewModel.eetmeterLogin(email: emailInput, password: passwordInput) }
          } label: {
            HStack {
              if viewModel.isEetmeterLoading {
                ProgressView().scaleEffect(0.8)
              }
              Text(viewModel.isEetmeterLoading ? "Inloggen…" : "Inloggen")
                .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(Color.orange)
            .foregroundColor(.white)
            .cornerRadius(12)
          }
          .disabled(viewModel.isEetmeterLoading || emailInput.isEmpty || passwordInput.isEmpty)
          .opacity(viewModel.isEetmeterLoading || emailInput.isEmpty || passwordInput.isEmpty ? 0.6 : 1)
        }
        .padding(.horizontal, 24)
      }
      .padding(.bottom, 32)
    }
  }

  // MARK: Dag view

  private var dagView: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 0) {

        // ── Datum navigatie ──────────────────────────────────
        datumNavigatie
          .padding(.horizontal, 16)
          .padding(.top, 12)

        // ── Totalen ──────────────────────────────────────────
        if let dag = viewModel.eetmeterDag {
          totalenBanner(dag: dag)
            .padding(.horizontal, 16)
            .padding(.top, 12)
        }

        // ── Laden ──────────────────────────────────────────
        if viewModel.isEetmeterLoading {
          HStack {
            Spacer()
            ProgressView("Laden…")
            Spacer()
          }
          .padding(.top, 24)
        }

        // ── Fout ──────────────────────────────────────────
        if let err = viewModel.eetmeterError {
          Text(err)
            .font(.caption)
            .foregroundColor(MFColors.error)
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }

        // ── Maaltijden ──────────────────────────────────────
        if let dag = viewModel.eetmeterDag {
          if dag.maaltijden.isEmpty {
            MFEmptyState(
              icon: "fork.knife.circle",
              title: "Geen consumptie",
              subtitle: "Geen eetmomenten geregistreerd voor \(viewModel.eetmeterDatum)."
            )
            .padding(.top, 20)
          } else {
            ForEach(dag.maaltijden) { maaltijd in
              maaltijdKaart(maaltijd: maaltijd)
                .padding(.horizontal, 16)
                .padding(.top, 12)
            }
          }
        } else if !viewModel.isEetmeterLoading {
          MFEmptyState(
            icon: "arrow.clockwise.circle",
            title: "Geen data",
            subtitle: "Tik op Vernieuwen om de dagconsumptie op te halen."
          )
          .padding(.top, 20)
        }

        Spacer(minLength: 32)
      }
    }
  }

  // MARK: Datum navigatie

  private var datumNavigatie: some View {
    HStack(spacing: 12) {
      Button {
        Task { await viewModel.eetmeterVorigeDag() }
      } label: {
        Image(systemName: "chevron.left")
          .font(.subheadline.weight(.semibold))
      }
      .buttonStyle(.bordered)
      .disabled(viewModel.isEetmeterLoading)

      Spacer()

      VStack(spacing: 2) {
        Text(datumLabel)
          .font(.subheadline.weight(.semibold))
        if viewModel.isEetmeterLoading {
          ProgressView().scaleEffect(0.7)
        }
      }
      .onTapGesture {
        Task { await viewModel.loadEetmeterDag() }
      }

      Spacer()

      Button {
        Task { await viewModel.eetmeterVolgendeDag() }
      } label: {
        Image(systemName: "chevron.right")
          .font(.subheadline.weight(.semibold))
      }
      .buttonStyle(.bordered)
      .disabled(viewModel.isEetmeterLoading || isVandaag)
      .opacity(isVandaag ? 0.4 : 1)
    }
  }

  private var datumLabel: String {
    guard !viewModel.eetmeterDatum.isEmpty else { return "Vandaag" }
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd"
    f.locale = Locale(identifier: "nl_NL")
    guard let date = f.date(from: viewModel.eetmeterDatum) else { return viewModel.eetmeterDatum }
    let g = DateFormatter()
    g.locale = Locale(identifier: "nl_NL")
    g.dateFormat = "EEEE d MMMM"
    return g.string(from: date).capitalized
  }

  private var isVandaag: Bool {
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd"
    return viewModel.eetmeterDatum == f.string(from: Date())
  }

  // MARK: Totalen banner

  private func totalenBanner(dag: EetmeterDagItem) -> some View {
    HStack(spacing: 16) {
      macroBadge(label: "kcal", waarde: dag.totaalEnergie, eenheid: "", kleur: MFColors.accent)
      Divider().frame(height: 32)
      macroBadge(label: "Eiwit", waarde: dag.totaalEiwit, eenheid: "g")
      macroBadge(label: "Vet", waarde: dag.totaalVet, eenheid: "g")
      macroBadge(label: "Koolhyd.", waarde: dag.totaalKoolhydraten, eenheid: "g")
    }
    .padding(14)
    .background(
      RoundedRectangle(cornerRadius: 14)
        .fill(Color(.secondarySystemGroupedBackground))
    )
  }

  private func macroBadge(label: String, waarde: Double, eenheid: String, kleur: Color = .primary) -> some View {
    VStack(spacing: 2) {
      Text(label)
        .font(.caption2)
        .foregroundColor(.secondary)
      Text("\(Int(waarde))\(eenheid)")
        .font(.subheadline.bold())
        .foregroundColor(kleur)
    }
    .frame(maxWidth: .infinity)
  }

  // MARK: Maaltijd kaart

  private func maaltijdKaart(maaltijd: EetmeterMaaltijdItem) -> some View {
    VStack(alignment: .leading, spacing: 0) {

      // Header
      HStack {
        VStack(alignment: .leading, spacing: 2) {
          Text(maaltijd.naam)
            .font(.subheadline.bold())
          Text("\(Int(maaltijd.energie)) kcal")
            .font(.caption)
            .foregroundColor(MFColors.accent)
        }
        Spacer()
        HStack(spacing: 6) {
          macroChip("E", value: maaltijd.eiwit)
          macroChip("V", value: maaltijd.vet)
          macroChip("K", value: maaltijd.koolhydraten)
        }
      }
      .padding(14)

      Divider()
        .padding(.horizontal, 14)

      // Items
      VStack(alignment: .leading, spacing: 0) {
        ForEach(maaltijd.items) { item in
          HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 1) {
              Text(item.productNaam)
                .font(.subheadline)
                .lineLimit(1)
              if !item.merkNaam.isEmpty {
                Text(item.merkNaam)
                  .font(.caption2)
                  .foregroundColor(.secondary)
              }
            }
            Spacer()
            Text("\(Int(item.hoeveelheid)) \(item.eenheid)")
              .font(.caption)
              .foregroundColor(.secondary)
            Text("\(Int(item.energie)) kcal")
              .font(.caption.monospacedDigit())
              .foregroundColor(.secondary)
              .frame(minWidth: 52, alignment: .trailing)
          }
          .padding(.horizontal, 14)
          .padding(.vertical, 8)
          Divider().padding(.horizontal, 14)
        }
      }
    }
    .background(
      RoundedRectangle(cornerRadius: 14)
        .fill(Color(.secondarySystemGroupedBackground))
    )
  }

  private func macroChip(_ label: String, value: Double) -> some View {
    Text("\(label) \(Int(value))g")
      .font(.caption2)
      .padding(.horizontal, 6)
      .padding(.vertical, 3)
      .background(Color(.tertiarySystemBackground))
      .cornerRadius(6)
      .foregroundColor(.secondary)
  }
}
