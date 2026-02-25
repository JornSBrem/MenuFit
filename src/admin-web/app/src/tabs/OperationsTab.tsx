import { useState, type FormEvent } from "react";
import type {
  AdminAsyncViewState,
  AdminOperationsViewData,
  AdminOperationReport,
  HouseholdOperationsStatus,
  HouseholdInvitationRecord,
  UserSessionDiagnostic,
} from "@lib/types.ts";
import type { AdminDashboardController } from "@lib/admin-dashboard-controller.ts";
import { card, section, table, th, td, btn, emptyMsg, fieldset, label, input } from "./shared-styles.ts";

interface OperationsTabProps {
  viewState: AdminAsyncViewState<AdminOperationsViewData>;
  controller: AdminDashboardController;
  onStateChange: () => void;
}

function ReportRow({ report }: { report: AdminOperationReport }) {
  return (
    <tr>
      <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{report.reportId.slice(0, 8)}…</td>
      <td style={td}>{report.operationType}</td>
      <td style={{ ...td, color: report.status === "completed" ? "#0a6d3a" : "#6e6e73", fontWeight: 600 }}>
        {report.status}
      </td>
      <td style={td}>{report.performedBy}</td>
      <td style={td}>{new Date(report.createdAt).toLocaleString("nl-NL")}</td>
      <td style={td}>{report.message}</td>
    </tr>
  );
}

function HouseholdRow({
  status,
  onLoadInvitations,
}: {
  status: HouseholdOperationsStatus;
  onLoadInvitations: (householdId: string) => void;
}) {
  return (
    <tr>
      <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{status.householdId.slice(0, 12)}…</td>
      <td style={td}>{status.memberCount}</td>
      <td style={td}>{status.pendingInvitationCount}</td>
      <td style={td}>{new Date(status.updatedAt).toLocaleString("nl-NL")}</td>
      <td style={td}>
        <button style={btn} onClick={() => onLoadInvitations(status.householdId)}>
          Uitnodigingen
        </button>
      </td>
    </tr>
  );
}

function InvitationRow({
  inv,
  controller,
  onStateChange,
}: {
  inv: HouseholdInvitationRecord;
  controller: AdminDashboardController;
  onStateChange: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const resend = async () => {
    setBusy(true);
    await controller.resendInvitation({
      householdId: inv.householdId,
      invitedUserId: inv.invitedUserId,
    });
    onStateChange();
    setBusy(false);
  };

  return (
    <tr>
      <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{inv.invitationId.slice(0, 8)}…</td>
      <td style={td}>{inv.invitedUserId}</td>
      <td style={{ ...td, color: inv.status === "accepted" ? "#0a6d3a" : inv.status === "revoked" ? "#c00" : "#6e6e73", fontWeight: 600 }}>
        {inv.status}
      </td>
      <td style={td}>{new Date(inv.createdAt).toLocaleString("nl-NL")}</td>
      <td style={td}>
        {inv.status === "pending" && (
          <button style={btn} onClick={() => void resend()} disabled={busy}>
            Opnieuw sturen
          </button>
        )}
      </td>
    </tr>
  );
}

function SessionDiagRow({
  diag,
  controller,
  onStateChange,
}: {
  diag: UserSessionDiagnostic;
  controller: AdminDashboardController;
  onStateChange: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const reset = async () => {
    if (!confirm("Sessie resetten voor " + diag.subjectId + "?")) return;
    setBusy(true);
    await controller.resetSession({
      householdId: diag.householdId,
      subjectId: diag.subjectId,
    });
    onStateChange();
    setBusy(false);
  };

  return (
    <tr>
      <td style={td}>{diag.subjectId}</td>
      <td style={td}>{diag.householdId.slice(0, 12)}…</td>
      <td style={{ ...td, color: diag.hasActiveSession ? "#0a6d3a" : "#c00", fontWeight: 600 }}>
        {diag.hasActiveSession ? "Actief" : "Inactief"}
      </td>
      <td style={td}>
        {diag.expiresAtEpochSeconds
          ? new Date(diag.expiresAtEpochSeconds * 1000).toLocaleString("nl-NL")
          : "—"}
      </td>
      <td style={td}>
        <button style={{ ...btn, background: "#c00" }} onClick={() => void reset()} disabled={busy}>
          Reset sessie
        </button>
      </td>
    </tr>
  );
}

export function OperationsTab({ viewState, controller, onStateChange }: OperationsTabProps) {
  const [diagSubjectId, setDiagSubjectId] = useState("");
  const [diagBusy, setDiagBusy] = useState(false);

  const data = viewState.data;

  const handleLoadHouseholds = async () => {
    await controller.loadHouseholdOperations();
    onStateChange();
  };

  const handleLoadInvitations = async (householdId: string) => {
    await controller.loadHouseholdOperations(householdId);
    onStateChange();
  };

  const handleDiagnoseSession = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!diagSubjectId.trim()) return;
    setDiagBusy(true);
    await controller.diagnoseSession(diagSubjectId.trim());
    onStateChange();
    setDiagBusy(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Operation history */}
      <div style={card}>
        <h3 style={section.title}>Operaties ({data?.history.length ?? 0})</h3>
        {!data || data.history.length === 0 ? (
          <p style={emptyMsg}>Geen operaties in de huidige sessie.</p>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Type</th>
                <th style={th}>Status</th>
                <th style={th}>Door</th>
                <th style={th}>Tijdstip</th>
                <th style={th}>Bericht</th>
              </tr>
            </thead>
            <tbody>
              {[...data.history].reverse().map((r) => (
                <ReportRow key={r.reportId} report={r} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Households */}
      <div style={card}>
        <div style={section.header}>
          <h3 style={section.title}>Huishoudens ({data?.householdStatuses.length ?? 0})</h3>
          <button style={btn} onClick={() => void handleLoadHouseholds()}>
            Laden
          </button>
        </div>
        {!data || data.householdStatuses.length === 0 ? (
          <p style={emptyMsg}>Klik op Laden om huishoudens op te halen.</p>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Household ID</th>
                <th style={th}>Leden</th>
                <th style={th}>Openstaande uitnodigingen</th>
                <th style={th}>Bijgewerkt</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {data.householdStatuses.map((s) => (
                <HouseholdRow
                  key={s.householdId}
                  status={s}
                  onLoadInvitations={(id) => void handleLoadInvitations(id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invitations */}
      {data && data.invitations.length > 0 && (
        <div style={card}>
          <h3 style={section.title}>Uitnodigingen ({data.invitations.length})</h3>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Uitnodiging ID</th>
                <th style={th}>Uitgenodigde</th>
                <th style={th}>Status</th>
                <th style={th}>Aangemaakt</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {data.invitations.map((inv) => (
                <InvitationRow
                  key={inv.invitationId}
                  inv={inv}
                  controller={controller}
                  onStateChange={onStateChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Session diagnose */}
      <div style={card}>
        <h3 style={section.title}>Sessie diagnostiek</h3>
        <form onSubmit={(e) => void handleDiagnoseSession(e)} style={fieldset}>
          <div style={label}>Subject ID (gebruiker)</div>
          <input
            style={input}
            value={diagSubjectId}
            onChange={(e) => setDiagSubjectId(e.target.value)}
            placeholder="user-uuid of email"
          />
          <button style={btn} type="submit" disabled={diagBusy || !diagSubjectId.trim()}>
            {diagBusy ? "Laden…" : "Diagnostiek ophalen"}
          </button>
        </form>

        {data && data.sessionStatuses.length > 0 && (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Subject ID</th>
                <th style={th}>Household</th>
                <th style={th}>Sessie</th>
                <th style={th}>Verloopt</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {data.sessionStatuses.map((d: UserSessionDiagnostic) => (
                <SessionDiagRow
                  key={d.subjectId}
                  diag={d}
                  controller={controller}
                  onStateChange={onStateChange}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
