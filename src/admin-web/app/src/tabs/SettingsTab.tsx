import { useState, type FormEvent } from "react";
import type { AdminAsyncViewState, AdminSettingsViewData } from "@lib/types.ts";
import type { AdminDashboardController } from "@lib/admin-dashboard-controller.ts";
import { card, section, table, th, td, btn, emptyMsg, fieldset, label, input, select } from "./shared-styles.ts";

interface SettingsTabProps {
  viewState: AdminAsyncViewState<AdminSettingsViewData>;
  controller: AdminDashboardController;
  onStateChange: () => void;
}

type ConfigKey =
  | "feature.toggle"
  | "matching.highConfidenceMin"
  | "matching.autoAcceptMin"
  | "llm.model"
  | "llm.provider";

const CONFIG_KEYS: { key: ConfigKey; type: "boolean" | "number" | "string"; description: string }[] = [
  { key: "feature.toggle", type: "boolean", description: "Feature toggle aan/uit" },
  { key: "matching.highConfidenceMin", type: "number", description: "Min. score voor hoge betrouwbaarheid" },
  { key: "matching.autoAcceptMin", type: "number", description: "Min. score voor automatisch accepteren" },
  { key: "llm.model", type: "string", description: "LLM model naam" },
  { key: "llm.provider", type: "string", description: "LLM provider (openai/azure)" },
];

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

function parseValue(key: ConfigKey, raw: string): string | number | boolean {
  const def = CONFIG_KEYS.find((c) => c.key === key);
  if (!def) return raw;
  if (def.type === "boolean") return raw === "true";
  if (def.type === "number") return Number(raw);
  return raw;
}

export function SettingsTab({ viewState, controller, onStateChange }: SettingsTabProps) {
  const [selectedKey, setSelectedKey] = useState<ConfigKey>("feature.toggle");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const data = viewState.data;

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const rawValue = String(fd.get("value") ?? "").trim();
    const parsed = parseValue(selectedKey, rawValue);
    setBusy(true);
    setSuccess(null);
    await controller.updateConfig({
      operationId: genId(),
      key: selectedKey,
      value: parsed,
    });
    onStateChange();
    setSuccess(`Instelling "${selectedKey}" opgeslagen.`);
    setBusy(false);
  };

  const selectedDef = CONFIG_KEYS.find((c) => c.key === selectedKey)!;
  const currentEntry = data?.entries.find((e) => e.key === selectedKey);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Config form */}
      <div style={card}>
        <div style={section.header}>
          <h3 style={section.title}>Runtime instellingen wijzigen</h3>
        </div>
        {success && (
          <div style={successBanner}>{success}</div>
        )}
        <form onSubmit={(e) => void handleSave(e)} style={fieldset}>
          <div style={label}>Instelling</div>
          <select
            style={{ ...{ border: "1px solid #d2d2d7", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "inherit", width: "100%", background: "#fff" } }}
            value={selectedKey}
            onChange={(e) => {
              setSelectedKey(e.target.value as ConfigKey);
              setSuccess(null);
            }}
          >
            {CONFIG_KEYS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.key} — {c.description}
              </option>
            ))}
          </select>

          <div style={label}>Waarde ({selectedDef.type})</div>
          {selectedDef.type === "boolean" ? (
            <select style={{ border: "1px solid #d2d2d7", borderRadius: 6, padding: "6px 10px", fontSize: 13, fontFamily: "inherit", width: "100%", background: "#fff" }} name="value" defaultValue={String(currentEntry?.value ?? "true")}>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <input
              style={input}
              name="value"
              type={selectedDef.type === "number" ? "number" : "text"}
              defaultValue={String(currentEntry?.value ?? "")}
              step={selectedDef.type === "number" ? "0.01" : undefined}
              required
            />
          )}

          {currentEntry && (
            <div style={{ fontSize: 12, color: "#6e6e73" }}>
              Huidige waarde: <strong>{String(currentEntry.value)}</strong> (bijgewerkt door {currentEntry.updatedBy} op{" "}
              {new Date(currentEntry.updatedAt).toLocaleString("nl-NL")})
            </div>
          )}

          <button style={btn} type="submit" disabled={busy}>
            {busy ? "Opslaan…" : "Instelling opslaan"}
          </button>
        </form>
      </div>

      {/* Current settings */}
      <div style={card}>
        <h3 style={section.title}>Huidige instellingen</h3>
        {!data || data.entries.length === 0 ? (
          <p style={emptyMsg}>Nog geen instellingen geregistreerd in deze sessie.</p>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Sleutel</th>
                <th style={th}>Waarde</th>
                <th style={th}>Bijgewerkt door</th>
                <th style={th}>Tijdstip</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => (
                <tr key={entry.key}>
                  <td style={td}><code>{entry.key}</code></td>
                  <td style={td}><strong>{String(entry.value)}</strong></td>
                  <td style={td}>{entry.updatedBy}</td>
                  <td style={td}>{new Date(entry.updatedAt).toLocaleString("nl-NL")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Audit trail */}
      <div style={card}>
        <h3 style={section.title}>Audit trail ({data?.auditTrail.length ?? 0} wijzigingen)</h3>
        {!data || data.auditTrail.length === 0 ? (
          <p style={emptyMsg}>Geen wijzigingen in de huidige sessie.</p>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Tijdstip</th>
                <th style={th}>Sleutel</th>
                <th style={th}>Nieuwe waarde</th>
                <th style={th}>Door</th>
              </tr>
            </thead>
            <tbody>
              {[...data.auditTrail].reverse().map((entry) => (
                <tr key={entry.operationId}>
                  <td style={td}>{new Date(entry.updatedAt).toLocaleString("nl-NL")}</td>
                  <td style={td}><code>{entry.key}</code></td>
                  <td style={td}>{String(entry.value)}</td>
                  <td style={td}>{entry.updatedBy}</td>
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
  padding: "8px 14px",
  borderRadius: 6,
  marginBottom: 12,
  fontSize: 13,
} as const;

// suppress unused import warning
void select;
void label;
