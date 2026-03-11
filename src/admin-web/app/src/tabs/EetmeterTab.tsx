import { useState, useCallback } from "react";
import type { AdminAsyncViewState, EetmeterViewData, EetmeterMaaltijdRecord } from "@lib/types.ts";
import type { AdminDashboardController } from "@lib/admin-dashboard-controller.ts";
import * as S from "./shared-styles.ts";

interface EetmeterTabProps {
  viewState: AdminAsyncViewState<EetmeterViewData>;
  controller: AdminDashboardController;
  onStateChange: () => void;
}

// ---- Login formulier -------------------------------------------------------

function LoginForm({
  onLogin,
  loading,
}: {
  onLogin: (email: string, password: string) => void;
  loading: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div style={styles.loginCard}>
      <h3 style={{ margin: "0 0 8px 0", fontSize: 16 }}>🍎 Koppel met Eetmeter</h3>
      <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#6e6e73" }}>
        Voer je Voedingscentrum Eetmeter inloggegevens in om je dagconsumptie te bekijken.
      </p>
      <div style={styles.formRow}>
        <label style={S.label}>E-mailadres</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="naam@voorbeeld.nl"
          style={S.input}
          autoComplete="email"
        />
      </div>
      <div style={styles.formRow}>
        <label style={S.label}>Wachtwoord</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          style={S.input}
          autoComplete="current-password"
        />
      </div>
      <button
        style={{ ...S.btn, marginTop: 8, opacity: loading ? 0.6 : 1 }}
        onClick={() => onLogin(email, password)}
        disabled={loading || !email || !password}
      >
        {loading ? "Bezig met inloggen…" : "Inloggen"}
      </button>
    </div>
  );
}

// ---- Datum navigatie -------------------------------------------------------

function DatumNavigatie({
  datum,
  onDag,
}: {
  datum: string;
  onDag: (datum: string) => void;
}) {
  const vorige = useCallback(() => {
    const d = new Date(datum);
    d.setDate(d.getDate() - 1);
    onDag(d.toISOString().split("T")[0]);
  }, [datum, onDag]);

  const volgende = useCallback(() => {
    const d = new Date(datum);
    d.setDate(d.getDate() + 1);
    onDag(d.toISOString().split("T")[0]);
  }, [datum, onDag]);

  const vandaag = useCallback(() => {
    onDag(new Date().toISOString().split("T")[0]);
  }, [onDag]);

  const isVandaag = datum === new Date().toISOString().split("T")[0];

  const datumLabel = new Date(datum + "T12:00:00").toLocaleDateString("nl-NL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={styles.dagNav}>
      <button style={S.btnSecondary} onClick={vorige}>‹ Vorige</button>
      <div style={styles.dagTitel}>
        <span style={styles.dagNaam}>{datumLabel}</span>
        {!isVandaag && (
          <button style={{ ...S.btnSecondary, marginLeft: 8, fontSize: 11 }} onClick={vandaag}>
            Vandaag
          </button>
        )}
      </div>
      <button
        style={{ ...S.btnSecondary, opacity: isVandaag ? 0.4 : 1 }}
        onClick={volgende}
        disabled={isVandaag}
      >
        Volgende ›
      </button>
    </div>
  );
}

// ---- Macro badge -----------------------------------------------------------

function MacroBadge({ label, waarde, eenheid = "g", kleur = "#1d1d1f" }: {
  label: string;
  waarde: number;
  eenheid?: string;
  kleur?: string;
}) {
  return (
    <div style={styles.macroBadge}>
      <span style={{ fontSize: 11, color: "#6e6e73" }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: kleur }}>
        {Math.round(waarde)}{eenheid}
      </span>
    </div>
  );
}

// ---- Totalen banner --------------------------------------------------------

function TotalenBanner({ dag }: { dag: EetmeterViewData["dag"] }) {
  if (!dag) return null;
  return (
    <div style={styles.totalenBanner}>
      <MacroBadge label="kcal" waarde={dag.totaalEnergie} eenheid=" kcal" kleur="#0071e3" />
      <div style={styles.divider} />
      <MacroBadge label="Eiwit" waarde={dag.totaalEiwit} />
      <MacroBadge label="Vet" waarde={dag.totaalVet} />
      <MacroBadge label="Koolhyd." waarde={dag.totaalKoolhydraten} />
    </div>
  );
}

// ---- Maaltijd kaart --------------------------------------------------------

function MaaltijdKaart({ maaltijd }: { maaltijd: EetmeterMaaltijdRecord }) {
  const [open, setOpen] = useState(true);

  return (
    <div style={S.card}>
      <div style={styles.maaltijdHeader} onClick={() => setOpen((v) => !v)}>
        <div>
          <span style={styles.maaltijdNaam}>{maaltijd.naam}</span>
          <span style={styles.maaltijdKcal}>{Math.round(maaltijd.energie)} kcal</span>
        </div>
        <div style={styles.maaltijdMacros}>
          <span style={styles.macroSmall}>E {Math.round(maaltijd.eiwit)}g</span>
          <span style={styles.macroSmall}>V {Math.round(maaltijd.vet)}g</span>
          <span style={styles.macroSmall}>K {Math.round(maaltijd.koolhydraten)}g</span>
          <span style={{ fontSize: 14, color: "#6e6e73" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Product</th>
              <th style={{ ...S.th, textAlign: "right" }}>Hoeveelheid</th>
              <th style={{ ...S.th, textAlign: "right" }}>kcal</th>
              <th style={{ ...S.th, textAlign: "right" }}>E</th>
              <th style={{ ...S.th, textAlign: "right" }}>V</th>
              <th style={{ ...S.th, textAlign: "right" }}>K</th>
            </tr>
          </thead>
          <tbody>
            {maaltijd.items.map((item) => (
              <tr key={item.id}>
                <td style={S.td}>
                  <div style={styles.productNaam}>{item.productNaam}</div>
                  {item.merkNaam && (
                    <div style={styles.merkNaam}>{item.merkNaam}</div>
                  )}
                </td>
                <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>
                  {item.hoeveelheid} {item.eenheid}
                </td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: 500 }}>
                  {Math.round(item.energie)}
                </td>
                <td style={{ ...S.td, textAlign: "right", color: "#6e6e73" }}>
                  {Math.round(item.eiwit)}g
                </td>
                <td style={{ ...S.td, textAlign: "right", color: "#6e6e73" }}>
                  {Math.round(item.vet)}g
                </td>
                <td style={{ ...S.td, textAlign: "right", color: "#6e6e73" }}>
                  {Math.round(item.koolhydraten)}g
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---- Hoofd component -------------------------------------------------------

export function EetmeterTab({ viewState, controller, onStateChange }: EetmeterTabProps) {
  const [loginLoading, setLoginLoading] = useState(false);

  const data = viewState.data;
  const isLoading = viewState.status === "loading";

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      setLoginLoading(true);
      await controller.eetmeterLogin({ email, password });
      onStateChange();
      setLoginLoading(false);
    },
    [controller, onStateChange],
  );

  const handleDag = useCallback(
    async (datum: string) => {
      await controller.loadEetmeterView(datum);
      onStateChange();
    },
    [controller, onStateChange],
  );

  const handleRefresh = useCallback(async () => {
    await controller.loadEetmeterView(data?.datum);
    onStateChange();
  }, [controller, data?.datum, onStateChange]);

  // Nog niet ingelogd: toon login formulier
  if (!data?.isIngelogd) {
    return (
      <div style={styles.root}>
        <LoginForm onLogin={handleLogin} loading={loginLoading || isLoading} />
      </div>
    );
  }

  // Ingelogd: toon dagweergave
  const datum = data.datum ?? new Date().toISOString().split("T")[0];
  const dag = data.dag;

  return (
    <div style={styles.root}>
      {/* Header met datum navigatie */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={styles.headerRow}>
          <div>
            <h2 style={styles.pageTitle}>🍎 Eetmeter Dagboek</h2>
          </div>
          <button
            style={{ ...S.btnSecondary, opacity: isLoading ? 0.5 : 1 }}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? "Laden…" : "↻ Vernieuwen"}
          </button>
        </div>
        <DatumNavigatie datum={datum} onDag={handleDag} />
      </div>

      {/* Totalen */}
      {dag && <TotalenBanner dag={dag} />}

      {/* Lege dag */}
      {dag && dag.maaltijden.length === 0 && (
        <div style={{ ...S.card, color: "#6e6e73", fontStyle: "italic", fontSize: 13 }}>
          Geen consumptie geregistreerd voor deze dag.
        </div>
      )}

      {/* Geen data geladen */}
      {!dag && !isLoading && (
        <div style={{ ...S.card, color: "#6e6e73", fontStyle: "italic", fontSize: 13 }}>
          Klik op Vernieuwen om de dagconsumptie te laden.
        </div>
      )}

      {/* Maaltijd kaarten */}
      {dag?.maaltijden.map((maaltijd) => (
        <div key={maaltijd.periode} style={{ marginBottom: 12 }}>
          <MaaltijdKaart maaltijd={maaltijd} />
        </div>
      ))}
    </div>
  );
}

// ---- Styles ----------------------------------------------------------------

const styles = {
  root: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 0,
  },
  loginCard: {
    background: "#fff",
    borderRadius: 10,
    padding: 24,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    maxWidth: 440,
  },
  formRow: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    marginBottom: 12,
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  pageTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
  },
  dagNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  dagTitel: {
    display: "flex",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  dagNaam: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1d1d1f",
    textTransform: "capitalize" as const,
  },
  totalenBanner: {
    background: "#fff",
    borderRadius: 10,
    padding: "14px 20px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap" as const,
  },
  macroBadge: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    minWidth: 64,
    gap: 2,
  },
  divider: {
    width: 1,
    height: 32,
    background: "#e5e5ea",
    margin: "0 8px",
  },
  maaltijdHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    cursor: "pointer",
    userSelect: "none" as const,
  },
  maaltijdNaam: {
    fontSize: 15,
    fontWeight: 600,
    marginRight: 10,
  },
  maaltijdKcal: {
    fontSize: 13,
    color: "#0071e3",
    fontWeight: 500,
  },
  maaltijdMacros: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  macroSmall: {
    fontSize: 12,
    color: "#6e6e73",
    background: "#f5f5f7",
    padding: "2px 6px",
    borderRadius: 4,
  },
  productNaam: {
    fontSize: 13,
    fontWeight: 500,
  },
  merkNaam: {
    fontSize: 11,
    color: "#6e6e73",
    marginTop: 1,
  },
} as const;
