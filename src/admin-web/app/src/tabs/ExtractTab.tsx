import { useState, useEffect, useRef, type FormEvent } from "react";
import type { AdminAsyncViewState, AdminExtractViewData, BackgroundJob, SystemJobRecord } from "@lib/types.ts";
import type { AdminDashboardController } from "@lib/admin-dashboard-controller.ts";
import { card, section, table, th, td, btn, btnDanger, emptyMsg, fieldset, label, input } from "./shared-styles.ts";

interface ExtractTabProps {
  viewState: AdminAsyncViewState<AdminExtractViewData>;
  controller: AdminDashboardController;
  onStateChange: () => void;
}

function genId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback voor non-secure contexts (HTTP op LAN)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function statusColor(status: SystemJobRecord["status"]): string {
  if (status === "completed") return "#0a6d3a";
  if (status === "failed") return "#c00";
  if (status === "running") return "#0071e3";
  return "#6e6e73";
}

const PG_CRED_KEY = "menufit:pg-credentials";

function loadSavedPgCredentials(): { email: string; password: string } | null {
  try {
    const raw = localStorage.getItem(PG_CRED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.email === "string" && typeof parsed.password === "string") {
      return parsed;
    }
  } catch { /* corrupt data */ }
  return null;
}

export function ExtractTab({ viewState, controller, onStateChange }: ExtractTabProps) {
  const saved = loadSavedPgCredentials();
  const [pgEmail, setPgEmail] = useState(saved?.email ?? "");
  const [pgPassword, setPgPassword] = useState(saved?.password ?? "");
  const [pgRemember, setPgRemember] = useState(saved !== null);
  const [pgLoginBusy, setPgLoginBusy] = useState(false);
  const [pgDiscoverBusy, setPgDiscoverBusy] = useState(false);
  const [discoverYear, setDiscoverYear] = useState(() => new Date().getFullYear());
  const [ingestBusy, setIngestBusy] = useState(false);
  const [recomputeBusy, setRecomputeBusy] = useState(false);
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [reprocessBusy, setReprocessBusy] = useState(false);
  const [ingestWebBusy, setIngestWebBusy] = useState(false);
  const [discoverRecipesBusy, setDiscoverRecipesBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const data = viewState.data;
  const activeIngestJob = data?.activeIngestJob;
  const activeBackgroundJob = data?.activeBackgroundJob;
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bgPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generieke polling helper
  const useJobPolling = (
    job: BackgroundJob | undefined,
    ref: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
    pollFn: (jobId: string) => Promise<unknown>,
  ) => {
    useEffect(() => {
      if (!job || job.status !== "running") {
        if (ref.current) { clearInterval(ref.current); ref.current = null; }
        return;
      }
      if (ref.current) return;
      ref.current = setInterval(() => {
        void pollFn(job.jobId).then(() => { onStateChange(); });
      }, 1000);
      return () => { if (ref.current) { clearInterval(ref.current); ref.current = null; } };
    }, [job?.jobId, job?.status]);
  };

  // Poll ingest jobs
  useJobPolling(activeIngestJob, pollingRef, (jobId) => controller.getIngestStatus(jobId));

  // Toon resultaat wanneer ingest klaar is
  useEffect(() => {
    if (activeIngestJob && activeIngestJob.status !== "running") {
      setIngestBusy(false);
      const meta = activeIngestJob.meta as Record<string, unknown> | undefined;
      if (activeIngestJob.status === "completed") {
        setSuccessMsg(`Ingest klaar: ${meta?.goldProjected ?? 0} gold-records, ${meta?.tasksRan ?? 0} taken. ${activeIngestJob.errors.length > 0 ? `(${activeIngestJob.errors.length} waarschuwingen)` : ""}`);
      } else if (activeIngestJob.status === "failed") {
        setErrorMsg(`Ingest mislukt: ${activeIngestJob.errors[0] ?? "onbekende fout"}`);
      }
    }
  }, [activeIngestJob?.status]);

  // Poll background jobs (discover-recipes, etc.)
  useJobPolling(activeBackgroundJob, bgPollingRef, (jobId) => controller.getJobStatus(jobId));

  // Toon resultaat wanneer background job klaar is
  useEffect(() => {
    if (activeBackgroundJob && activeBackgroundJob.status !== "running") {
      setDiscoverRecipesBusy(false);
      const meta = activeBackgroundJob.meta as Record<string, unknown> | undefined;
      if (activeBackgroundJob.status === "completed") {
        setSuccessMsg(`Recepten: ${meta?.discovered ?? "?"} ontdekt, ${meta?.imported ?? "?"} nieuw, ${meta?.skipped ?? "?"} overgeslagen (${activeBackgroundJob.errors.length} fouten).`);
      } else if (activeBackgroundJob.status === "failed") {
        setErrorMsg(`Mislukt: ${activeBackgroundJob.errors[0] ?? "onbekende fout"}`);
      }
    }
  }, [activeBackgroundJob?.status]);

  /** Geeft true als de extract-view in de staat een fout heeft. StatusBanner toont die fout al. */
  const extractHasError = (state: { views: { extract: { status: string } } }): boolean =>
    state.views.extract.status === "error";

  const handlePgLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = pgEmail.trim();
    const password = pgPassword;
    setPgLoginBusy(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const nextState = await controller.pgLogin({ email, password });
      onStateChange();
      if (!extractHasError(nextState)) {
        // Sla credentials op of verwijder ze
        if (pgRemember) {
          localStorage.setItem(PG_CRED_KEY, JSON.stringify({ email, password }));
        } else {
          localStorage.removeItem(PG_CRED_KEY);
        }
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
      const nextState = await controller.pgDiscover(discoverYear);
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
      const discoverState = await controller.pgDiscover(discoverYear);
      onStateChange();
      if (extractHasError(discoverState)) return; // StatusBanner toont de fout al

      const discoverResult = discoverState.views.extract.data?.pgDiscoverResult;
      if (!discoverResult || discoverResult.availableWeeks.length === 0) {
        setErrorMsg("Geen beschikbare weken gevonden in de PG API.");
        return;
      }
      setIngestBusy(true);
      const ingestState = await controller.runIngest({
        operationId: genId(),
        weeks: discoverResult.availableWeeks,
        basePersons: discoverResult.defaultBasePersons,
      });
      onStateChange();
      if (extractHasError(ingestState)) {
        setIngestBusy(false);
      }
      // ingestBusy blijft true — polling (useEffect) zet hem uit als de job klaar is
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Ontdekken of ingest mislukt.");
      setIngestBusy(false);
    } finally {
      setPgDiscoverBusy(false);
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

  const handleReprocessFromBronze = async () => {
    setReprocessBusy(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const nextState = await controller.reprocessFromBronze();
      onStateChange();
      const result = nextState.views.extract.data?.reprocessResult;
      if (result) {
        setSuccessMsg(`Herverwerkt: ${result.processed} transforms, ${result.totalMeals} maaltijden (${result.filesScanned} bronzebestanden).`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Herverwerken mislukt.");
    } finally {
      setReprocessBusy(false);
    }
  };

  const handleIngestRecipeWeb = async () => {
    setIngestWebBusy(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const nextState = await controller.ingestRecipeWeb();
      onStateChange();
      const result = nextState.views.extract.data?.ingestRecipeWebResult;
      if (result) {
        setSuccessMsg(`Receptdata: ${result.withData}/${result.fetched} recepten met data (${result.errors.length} fouten).`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Recepten inladen mislukt.");
    } finally {
      setIngestWebBusy(false);
    }
  };

  const handleDiscoverAndImportRecipes = async () => {
    setDiscoverRecipesBusy(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await controller.discoverAndImportRecipes();
      onStateChange();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Recepten ontdekken/importeren mislukt.");
      setDiscoverRecipesBusy(false);
    }
  };

  const [fetchImagesBusy, setFetchImagesBusy] = useState(false);
  const handleFetchRecipeImages = async () => {
    setFetchImagesBusy(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await controller.fetchRecipeImages();
      onStateChange();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Foto's ophalen mislukt.");
      setFetchImagesBusy(false);
    }
  };

  const [downloadImagesBusy, setDownloadImagesBusy] = useState(false);
  const handleDownloadRecipeImages = async () => {
    setDownloadImagesBusy(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await controller.downloadRecipeImages();
      onStateChange();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Foto's downloaden mislukt.");
      setDownloadImagesBusy(false);
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
          <input style={input} name="email" type="email" placeholder="naam@example.com" autoComplete="username" required
            value={pgEmail} onChange={(e) => setPgEmail(e.target.value)} />
          <div style={label}>Wachtwoord</div>
          <input style={input} name="password" type="password" placeholder="••••••••" autoComplete="current-password" required
            value={pgPassword} onChange={(e) => setPgPassword(e.target.value)} />
          <label style={checkboxRow}>
            <input type="checkbox" checked={pgRemember} onChange={(e) => {
              setPgRemember(e.target.checked);
              if (!e.target.checked) localStorage.removeItem(PG_CRED_KEY);
            }} />
            <span>Onthoud inloggegevens</span>
          </label>
          <button style={btn} type="submit" disabled={pgLoginBusy}>
            {pgLoginBusy ? "Inloggen…" : "Inloggen bij PG"}
          </button>
        </form>
      </div>

      {/* Discover */}
      <div style={card}>
        <h3 style={section.title}>Ontdek beschikbare weken</h3>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6e6e73" }}>
          Controleert welke weeknummers beschikbaar zijn in de PG API voor het geselecteerde jaar.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: "#1d1d1f" }}>Jaar:</span>
          {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
            <button
              key={y}
              onClick={() => setDiscoverYear(y)}
              style={{
                ...btn,
                background: discoverYear === y ? "#0071e3" : "#e5e5ea",
                color: discoverYear === y ? "#fff" : "#1d1d1f",
                padding: "4px 14px",
                fontSize: 13,
              }}
            >
              {y}
            </button>
          ))}
        </div>

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
            {/* Diagnostiek bij lege resultaten */}
            {data.pgDiscoverResult.availableWeeks.length === 0 && (
              <div style={{ marginTop: 8, padding: 8, background: "#f8f0e0", borderRadius: 6, fontSize: 12, color: "#6e6e73" }}>
                <div><strong>Diagnostiek:</strong></div>
                <div>Auth headers aanwezig: {data.pgDiscoverResult.hasAuth ? "Ja" : "Nee — log eerst in bij PG"}</div>
                {data.pgDiscoverResult.firstProbe && (
                  <div style={{ marginTop: 4 }}>
                    <div>Eerste probe (week {data.pgDiscoverResult.firstProbe.week}): HTTP {data.pgDiscoverResult.firstProbe.status}</div>
                    <pre style={{ margin: "4px 0 0", padding: 6, background: "#f5f5f5", borderRadius: 4, fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                      {data.pgDiscoverResult.firstProbe.bodySnippet || "(lege body)"}
                    </pre>
                  </div>
                )}
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

      {/* Ingest voortgang */}
      {activeIngestJob && <IngestProgress job={activeIngestJob} />}

      {/* Ingest */}
      <div style={card}>
        <h3 style={section.title}>Ingest uitvoeren</h3>
        <form onSubmit={(e) => void handleIngest(e)} style={fieldset}>
          <div style={label}>Weken (kommagescheiden, bijv. 202510,202511)</div>
          <input style={input} name="weeks" placeholder="202510,202511" required />
          <div style={label}>Base persons (kommagescheiden, bijv. 1,2)</div>
          <input style={input} name="basePersons" placeholder="2" required />
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

      {/* Pipeline: herverwerken + recepten inladen */}
      <div style={card}>
        <h3 style={section.title}>Pipeline operaties</h3>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6e6e73" }}>
          Herbouw gold-data vanuit bestaande bronzebestanden, of laad ingrediënten &amp; bereidingsstappen in via de publieke receptpagina&apos;s.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={btn} onClick={() => void handleReprocessFromBronze()} disabled={reprocessBusy}>
            {reprocessBusy ? "Bezig…" : "Herverwerk bronze → gold"}
          </button>
          <button style={btn} onClick={() => void handleIngestRecipeWeb()} disabled={ingestWebBusy}>
            {ingestWebBusy ? "Bezig (~40s)…" : "Inladen recepten (web)"}
          </button>
          <button style={btn} onClick={() => void handleDiscoverAndImportRecipes()} disabled={discoverRecipesBusy}>
            {discoverRecipesBusy ? "Bezig (ontdekken + importeren)…" : "Nieuwe recepten ophalen"}
          </button>
          <button style={btn} onClick={() => void handleFetchRecipeImages()} disabled={fetchImagesBusy}>
            {fetchImagesBusy ? "Bezig (foto's ophalen)…" : "Ontbrekende foto's ophalen"}
          </button>
          <button style={btn} onClick={() => void handleDownloadRecipeImages()} disabled={downloadImagesBusy}>
            {downloadImagesBusy ? "Bezig (downloaden)…" : "Foto's lokaal opslaan"}
          </button>
        </div>
        {data?.reprocessResult && (
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#0a6d3a" }}>
            Laatste herverwerking: {data.reprocessResult.processed} transforms · {data.reprocessResult.totalMeals} maaltijden
          </p>
        )}
        {data?.ingestRecipeWebResult && (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#0a6d3a" }}>
            Laatste receptingest: {data.ingestRecipeWebResult.withData}/{data.ingestRecipeWebResult.fetched} recepten met data
          </p>
        )}
      </div>

      {/* Background job voortgang (discover-recipes, etc.) */}
      {activeBackgroundJob && <JobProgress job={activeBackgroundJob} />}

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

// ---- JobProgress component (generiek voor alle background jobs) -------------

const JOB_TYPE_LABELS: Record<string, string> = {
  "ingest": "Ingest",
  "discover-recipes": "Recepten ophalen",
};

function formatEta(startedAt: string, processed: number, total: number): string {
  if (processed <= 0 || total <= 0) return "";
  const elapsed = Date.now() - new Date(startedAt).getTime();
  const msPerItem = elapsed / processed;
  const remaining = (total - processed) * msPerItem;
  if (remaining < 60_000) return `~${Math.ceil(remaining / 1000)}s`;
  if (remaining < 3600_000) return `~${Math.ceil(remaining / 60_000)} min`;
  return `~${(remaining / 3600_000).toFixed(1)} uur`;
}

function JobProgress({ job }: { job: BackgroundJob }) {
  const isRunning = job.status === "running";
  const isDone = job.status === "completed";
  const isFailed = job.status === "failed";

  const pct = job.total > 0 ? Math.round((job.processed / job.total) * 100) : (isDone ? 100 : 0);
  const eta = isRunning ? formatEta(job.startedAt, job.processed, job.total) : "";
  const typeLabel = JOB_TYPE_LABELS[job.jobType] ?? job.jobType;

  const barColor = isFailed ? "#c00" : isDone ? "#0a6d3a" : "#0071e3";

  return (
    <div style={{
      ...card,
      border: `1px solid ${isFailed ? "#ffb3b3" : isDone ? "#8fd6b4" : "#b8d4f8"}`,
      background: isFailed ? "#fff0f0" : isDone ? "#f0fff4" : "#f0f7ff",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong style={{ fontSize: 14, color: barColor }}>
          {isRunning ? `⏳ ${typeLabel} bezig…` : isDone ? `✅ ${typeLabel} voltooid` : `❌ ${typeLabel} mislukt`}
        </strong>
        <span style={{ fontSize: 12, color: "#6e6e73" }}>
          {new Date(job.startedAt).toLocaleTimeString("nl-NL")}
          {job.finishedAt && ` → ${new Date(job.finishedAt).toLocaleTimeString("nl-NL")}`}
        </span>
      </div>

      {/* Voortgangsbalk */}
      <div style={{ background: "#e5e5ea", borderRadius: 4, height: 8, marginBottom: 6, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: barColor,
          borderRadius: 4,
          transition: "width 0.4s ease",
        }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#3a3a3c", marginBottom: 4 }}>
        <span>
          {job.phase}{job.total > 0 ? `: ${job.processed} / ${job.total}` : ""}
          {job.currentItem ? ` — ${job.currentItem}` : ""}
        </span>
        {eta && <span style={{ color: "#6e6e73" }}>ETA: {eta}</span>}
      </div>

      {job.errors.length > 0 && (
        <details style={{ marginTop: 6 }}>
          <summary style={{ fontSize: 12, color: "#c00", cursor: "pointer" }}>
            {job.errors.length} waarschuwing{job.errors.length !== 1 ? "en" : ""}
          </summary>
          <div style={{ marginTop: 4, fontSize: 11, color: "#c00", maxHeight: 120, overflowY: "auto" }}>
            {job.errors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        </details>
      )}
    </div>
  );
}

/** @deprecated Backwards-compat alias */
const IngestProgress = JobProgress;

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

const checkboxRow = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  color: "#1d1d1f",
  cursor: "pointer",
  margin: "4px 0",
} as const;

const discoverResultBox = {
  background: "#f5f5f7",
  border: "1px solid #d2d2d7",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 13,
  marginBottom: 12,
} as const;
