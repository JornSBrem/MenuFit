import { useState, type FormEvent } from "react";
import type { AdminAsyncViewState, AdminExtractViewData, SystemJobRecord } from "@lib/types.ts";
import type { AdminDashboardController } from "@lib/admin-dashboard-controller.ts";
import { card, section, table, th, td, btn, btnDanger, emptyMsg, fieldset, label, input } from "./shared-styles.ts";

interface ExtractTabProps {
  viewState: AdminAsyncViewState<AdminExtractViewData>;
  controller: AdminDashboardController;
  onStateChange: () => void;
}

function genId(): string {
  return crypto.randomUUID();
}

function statusColor(status: SystemJobRecord["status"]): string {
  if (status === "completed") return "#0a6d3a";
  if (status === "failed") return "#c00";
  if (status === "running") return "#0071e3";
  return "#6e6e73";
}

export function ExtractTab({ viewState, controller, onStateChange }: ExtractTabProps) {
  const [pgLoginBusy, setPgLoginBusy] = useState(false);
  const [pgDiscoverBusy, setPgDiscoverBusy] = useState(false);
  const [ingestBusy, setIngestBusy] = useState(false);
  const [recomputeBusy, setRecomputeBusy] = useState(false);
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const data = viewState.data;

  /** Geeft true als de extract-view in de staat een fout heeft. StatusBanner toont die fout al. */
  const extractHasError = (state: { views: { extract: { status: string } } }): boolean =>
    state.views.extract.status === "error";

  const handlePgLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPgLoginBusy(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const nextState = await controller.pgLogin({
        email: String(fd.get("email") ?? "").trim(),
        password: String(fd.get("password") ?? ""),
      });
      onStateChange();
      if (!extractHasError(nextState)) {
        setSuccessMsg("Ingelogd bij Project Gezond. Sessie-cookies zijn opgeslagen.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "PG login mislukt.");
    } finally {
      setPgLoginBusy(false);
    }
  };

  const handleDiscover = async () => {
    setPgDiscoverBusy(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const nextState = await controller.pgDiscover();
      onStateChange();
      if (!extractHasError(nextState)) {
        const found = nextState.views.extract.data?.pgDiscoverResult?.availableWeeks.length ?? 0;
        setSuccessMsg(
          found > 0
            ? `${found} beschikbare week${found === 1 ? "" : "nummers"} gevonden.`
            : "Geen beschikbare weken gevonden in de PG API.",
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Ontdekken mislukt.");
    } finally {
      setPgDiscoverBusy(false);
    }
  };

  const handleDiscoverAndIngest = async () => {
    setPgDiscoverBusy(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const discoverState = await controller.pgDiscover();
      onStateChange();
      if (extractHasError(discoverState)) return; // StatusBanner toont de fout al

      const discoverResult = discoverState.views.extract.data?.pgDiscoverResult;
      if (!discoverResult || discoverResult.availableWeeks.length === 0) {
        setErrorMsg("Geen beschikbare weken gevonden in de PG API.");
        return;
      }
      setIngestBusy(true);
      const ingestState = await controller.runIngest({
        operationId: crypto.randomUUID(),
        weeks: discoverResult.availableWeeks,
        kcals: discoverResult.defaultKcals,
        basePersons: discoverResult.defaultBasePersons,
      });
      onStateChange();
      if (!extractHasError(ingestState)) {
        setSuccessMsg(
          `Ingest gestart voor ${discoverResult.availableWeeks.length} weken (${discoverResult.availableWeeks.join(", ")}).`,
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Ontdekken of ingest mislukt.");
    } finally {
      setPgDiscoverBusy(false);
      setIngestBusy(false);
    }
  };

  const handleIngest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setIngestBusy(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await controller.runIngest({
        operationId: genId(),
        weeks: String(fd.get("weeks") ?? "")
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => !isNaN(n) && n > 0),
        kcals: String(fd.get("kcals") ?? "")
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => !isNaN(n) && n > 0),
        basePersons: String(fd.get("basePersons") ?? "")
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => !isNaN(n) && n > 0),
      });
      onStateChange();
      setSuccessMsg("Ingest gestart.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Ingest mislukt.");
    } finally {
      setIngestBusy(false);
    }
  };

  const handleRecompute = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setRecomputeBusy(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await controller.runRecompute({
        operationId: genId(),
        transformVersion: String(fd.get("transformVersion") ?? "").trim(),
        week: Number(fd.get("week")),
        kcal: Number(fd.get("kcal")),
        basePersons: Number(fd.get("basePersons")),
      });
      onStateChange();
      setSuccessMsg("Recompute gestart.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Recompute mislukt.");
    } finally {
      setRecomputeBusy(false);
    }
  };

  const handleCleanup = async (dryRun: boolean) => {
    setCleanupBusy(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await controller.runCleanup({
        operationId: genId(),
        dryRun,
        targets: ["bronze", "silver", "jobs"],
      });
      onStateChange();
      setSuccessMsg(`Cleanup ${dryRun ? "(dry-run)" : ""} gestart.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Cleanup mislukt.");
    } finally {
      setCleanupBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {successMsg && <div style={successBanner}>{successMsg}</div>}
      {errorMsg && <div style={errorBanner}>{errorMsg}</div>}

      {/* PG Login */}
      <div style={card}>
        <h3 style={section.title}>Project Gezond inloggen</h3>
        {data?.pgLoginStatus && (
          <div style={pgLoginStatusBanner}>
            ✅ Ingelogd — cookies: <strong>{data.pgLoginStatus.cookieNames.join(", ")}</strong>
            <span style={{ marginLeft: 8, opacity: 0.7, fontSize: 11 }}>
              {new Date(data.pgLoginStatus.loggedInAt).toLocaleString("nl-NL")}
            </span>
          </div>
        )}
        <form onSubmit={(e) => void handlePgLogin(e)} style={fieldset}>
          <div style={label}>E-mailadres</div>
          <input style={input} name="email" type="email" placeholder="naam@example.com" autoComplete="username" required />
          <div style={label}>Wachtwoord</div>
          <input style={input} name="password" type="password" placeholder="••••••••" autoComplete="current-password" required />
          <button style={btn} type="submit" disabled={pgLoginBusy}>
            {pgLoginBusy ? "Inloggen…" : "Inloggen bij PG"}
          </button>
        </form>
      </div>

      {/* Discover */}
      <div style={card}>
        <h3 style={section.title}>Ontdek beschikbare weken</h3>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6e6e73" }}>
          Controleert automatisch welke weeknummers beschikbaar zijn in de PG API (huidige week ±&nbsp;enkele weken).
        </p>

        {data?.pgDiscoverResult && (
          <div style={discoverResultBox}>
            {data.pgDiscoverResult.availableWeeks.length === 0 ? (
              <span style={{ color: "#c00" }}>Geen beschikbare weken gevonden.</span>
            ) : (
              <>
                <strong>Beschikbaar ({data.pgDiscoverResult.availableWeeks.length}):</strong>{" "}
                {data.pgDiscoverResult.availableWeeks.join(", ")}
                <span style={{ marginLeft: 12, color: "#6e6e73", fontSize: 11 }}>
                  geprobed: {data.pgDiscoverResult.probedWeeks.length} weken
                </span>
              </>
            )}
            {data.pgDiscoverResult.errors.length > 0 && (
              <div style={{ marginTop: 6, color: "#c00", fontSize: 12 }}>
                {data.pgDiscoverResult.errors.map((e) => (
                  <div key={e.week}>Week {e.week}: {e.error}</div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            style={btn}
            onClick={() => void handleDiscover()}
            disabled={pgDiscoverBusy || ingestBusy}
          >
            {pgDiscoverBusy ? "Bezig met ontdekken…" : "Ontdek beschikbare weken"}
          </button>
          <button
            style={{ ...btn, background: "#0a6d3a", color: "#fff" }}
            onClick={() => void handleDiscoverAndIngest()}
            disabled={pgDiscoverBusy || ingestBusy}
          >
            {pgDiscoverBusy || ingestBusy ? "Bezig…" : "Ontdek & inladen"}
          </button>
        </div>
      </div>

      {/* Ingest */}
      <div style={card}>
        <h3 style={section.title}>Ingest uitvoeren</h3>
        <form onSubmit={(e) => void handleIngest(e)} style={fieldset}>
          <div style={label}>Weken (kommagescheiden, bijv. 202510,202511)</div>
          <input style={input} name="weeks" placeholder="202510,202511" required />
          <div style={label}>Kcal waarden (kommagescheiden, bijv. 1800,2000)</div>
          <input style={input} name="kcals" placeholder="1800,2000" required />
          <div style={label}>Base persons (kommagescheiden, bijv. 1,2)</div>
          <input style={input} name="basePersons" placeholder="1,2" required />
          <button style={btn} type="submit" disabled={ingestBusy}>
            {ingestBusy ? "Ingest loopt…" : "Start ingest"}
          </button>
        </form>
      </div>

      {/* Recompute */}
      <div style={card}>
        <h3 style={section.title}>Recompute uitvoeren</h3>
        <form onSubmit={(e) => void handleRecompute(e)} style={fieldset}>
          <div style={label}>Transform versie</div>
          <input style={input} name="transformVersion" placeholder="v1" required />
          <div style={label}>Week</div>
          <input style={input} name="week" type="number" min={1} placeholder="202510" required />
          <div style={label}>Kcal</div>
          <input style={input} name="kcal" type="number" min={1} placeholder="2000" required />
          <div style={label}>Base persons</div>
          <input style={input} name="basePersons" type="number" min={1} placeholder="2" required />
          <button style={btn} type="submit" disabled={recomputeBusy}>
            {recomputeBusy ? "Recompute loopt…" : "Start recompute"}
          </button>
        </form>
      </div>

      {/* Cleanup */}
      <div style={card}>
        <h3 style={section.title}>Cleanup</h3>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6e6e73" }}>
          Targets: bronze, silver, jobs
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btn} onClick={() => void handleCleanup(true)} disabled={cleanupBusy}>
            Dry-run
          </button>
          <button style={btnDanger} onClick={() => void handleCleanup(false)} disabled={cleanupBusy}>
            Cleanup uitvoeren
          </button>
        </div>
      </div>

      {/* Jobs list */}
      <div style={card}>
        <div style={section.header}>
          <h3 style={section.title}>Jobs ({data?.jobs.length ?? 0})</h3>
        </div>
        {!data || data.jobs.length === 0 ? (
          <p style={emptyMsg}>Geen jobs gevonden.</p>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Job ID</th>
                <th style={th}>Type</th>
                <th style={th}>Mode</th>
                <th style={th}>Status</th>
                <th style={th}>Gestart</th>
                <th style={th}>Bericht</th>
              </tr>
            </thead>
            <tbody>
              {data.jobs.map((job) => (
                <tr key={job.jobId}>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{job.jobId.slice(0, 8)}…</td>
                  <td style={td}>{job.operationType}</td>
                  <td style={td}>{job.mode}</td>
                  <td style={{ ...td, color: statusColor(job.status), fontWeight: 600 }}>{job.status}</td>
                  <td style={td}>{new Date(job.startedAt).toLocaleString("nl-NL")}</td>
                  <td style={td}>{job.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const successBanner = {
  background: "#f0fff4",
  color: "#0a6d3a",
  border: "1px solid #8fd6b4",
  padding: "10px 14px",
  borderRadius: 8,
  fontSize: 13,
} as const;

const errorBanner = {
  background: "#fff0f0",
  color: "#c00",
  border: "1px solid #ffb3b3",
  padding: "10px 14px",
  borderRadius: 8,
  fontSize: 13,
} as const;

const pgLoginStatusBanner = {
  background: "#f0fff4",
  color: "#0a6d3a",
  border: "1px solid #8fd6b4",
  padding: "8px 12px",
  borderRadius: 6,
  fontSize: 13,
  marginBottom: 12,
} as const;

const discoverResultBox = {
  background: "#f5f5f7",
  border: "1px solid #d2d2d7",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 13,
  marginBottom: 12,
} as const;
