/**
 * Settings tab HTML renderer — framework-agnostic pure string output.
 *
 * Renders AdminAsyncViewState<AdminSettingsViewData> as an HTML fragment
 * that can be embedded in any shell (vanilla JS, React dangerouslySetInnerHTML,
 * server-side template, etc.).
 *
 * All user-supplied data is HTML-escaped. Interactive forms use data-action
 * attributes to let the host environment bind event handlers via controller.
 */
import type { AdminAsyncViewState, AdminSettingsViewData, AdminConfigAuditEntry, AdminSettingsEntry } from "../types.ts";

export interface ConfigKeySchema {
  key: string;
  type: "boolean" | "number" | "string";
  label: string;
}

/** Allowed runtime config keys mirroring AdminDashboardController.validateConfigUpdate rules. */
export const SETTINGS_SCHEMA: ConfigKeySchema[] = [
  { key: "feature.toggle", type: "boolean", label: "Feature toggle" },
  { key: "matching.highConfidenceMin", type: "number", label: "Matching: hoge betrouwbaarheidsdrempel" },
  { key: "matching.autoAcceptMin", type: "number", label: "Matching: auto-accept drempel" },
  { key: "llm.model", type: "string", label: "LLM: model" },
  { key: "llm.provider", type: "string", label: "LLM: provider" },
];

export interface SettingsFormState {
  key: string;
  rawValue: string;
  validationError?: string;
  confirmedKey?: string;
}

export interface RenderSettingsOptions {
  formState?: SettingsFormState;
  locale?: string;
}

const esc = (value: unknown): string => {
  const str = String(value ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const formatValue = (value: unknown): string => {
  if (value === null) {
    return "(leeg)";
  }
  if (typeof value === "boolean") {
    return value ? "Ja" : "Nee";
  }
  return String(value);
};

const renderLoading = (): string =>
  `<section class="settings-tab settings-tab--loading" aria-busy="true" aria-label="Instellingen laden">
  <p class="settings-status-message">Instellingen laden…</p>
</section>`;

const renderError = (code: string, message: string, hint?: string): string =>
  `<section class="settings-tab settings-tab--error">
  <div class="settings-error-banner" role="alert">
    <strong>Fout: ${esc(code)}</strong>
    <p>${esc(message)}${hint ? ` <span class="settings-error-hint">(${esc(hint)})</span>` : ""}</p>
  </div>
</section>`;

const renderSettingsTable = (entries: AdminSettingsEntry[]): string => {
  if (entries.length === 0) {
    return `<p class="settings-empty-message">Nog geen instellingen geconfigureerd.</p>`;
  }

  const rows = entries
    .map(
      (entry) =>
        `<tr>
      <td class="settings-key">${esc(entry.key)}</td>
      <td class="settings-value">${esc(formatValue(entry.value))}</td>
      <td class="settings-updated-by">${esc(entry.updatedBy)}</td>
      <td class="settings-updated-at">${esc(entry.updatedAt)}</td>
    </tr>`,
    )
    .join("\n");

  return `<table class="settings-table" aria-label="Huidige instellingen">
  <thead>
    <tr>
      <th scope="col">Sleutel</th>
      <th scope="col">Waarde</th>
      <th scope="col">Gewijzigd door</th>
      <th scope="col">Gewijzigd op</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>`;
};

const renderValueInput = (schema: ConfigKeySchema, rawValue: string): string => {
  if (schema.type === "boolean") {
    const trueSelected = rawValue === "true" ? ' selected="selected"' : "";
    const falseSelected = rawValue === "false" ? ' selected="selected"' : "";
    return `<select id="settings-value" name="value" class="settings-value-input" data-value-type="boolean" required>
      <option value="">— kies een waarde —</option>
      <option value="true"${trueSelected}>Ja (true)</option>
      <option value="false"${falseSelected}>Nee (false)</option>
    </select>`;
  }

  if (schema.type === "number") {
    return `<input id="settings-value" name="value" type="number" class="settings-value-input" data-value-type="number" value="${esc(rawValue)}" required />`;
  }

  return `<input id="settings-value" name="value" type="text" class="settings-value-input" data-value-type="string" value="${esc(rawValue)}" required />`;
};

const renderUpdateForm = (options?: RenderSettingsOptions): string => {
  const formState = options?.formState;
  const selectedKey = formState?.key ?? "";
  const rawValue = formState?.rawValue ?? "";
  const validationError = formState?.validationError;
  const confirmedKey = formState?.confirmedKey;

  const keyOptions = SETTINGS_SCHEMA.map((s) => {
    const selected = s.key === selectedKey ? ' selected="selected"' : "";
    return `<option value="${esc(s.key)}"${selected}>${esc(s.label)} (${esc(s.key)})</option>`;
  }).join("\n");

  const selectedSchema = SETTINGS_SCHEMA.find((s) => s.key === selectedKey);
  const valueInput = selectedSchema
    ? renderValueInput(selectedSchema, rawValue)
    : `<input id="settings-value" name="value" type="text" class="settings-value-input" value="${esc(rawValue)}" disabled placeholder="Selecteer eerst een sleutel" />`;

  const errorBanner = validationError
    ? `<div class="settings-form-error" role="alert" aria-live="assertive">${esc(validationError)}</div>`
    : "";

  const confirmBanner = confirmedKey && !validationError
    ? `<div class="settings-form-confirmation" role="status" aria-live="polite">Instelling <strong>${esc(confirmedKey)}</strong> succesvol bijgewerkt.</div>`
    : "";

  return `<form class="settings-update-form" data-action="updateConfig" novalidate>
  <fieldset>
    <legend>Instelling bijwerken</legend>
    ${errorBanner}
    ${confirmBanner}
    <div class="form-field">
      <label for="settings-key">Configuratiesleutel</label>
      <select id="settings-key" name="key" class="settings-key-select" required>
        <option value="">— kies een sleutel —</option>
        ${keyOptions}
      </select>
    </div>
    <div class="form-field">
      <label for="settings-value">Nieuwe waarde</label>
      ${valueInput}
    </div>
    <button type="submit" class="settings-submit-button">Instelling opslaan</button>
  </fieldset>
</form>`;
};

const renderAuditTrail = (audit: AdminConfigAuditEntry[]): string => {
  if (audit.length === 0) {
    return `<p class="audit-empty-message">Nog geen configuratiewijzigingen vastgelegd.</p>`;
  }

  const rows = [...audit]
    .reverse()
    .map(
      (entry) =>
        `<tr>
      <td class="audit-key">${esc(entry.key)}</td>
      <td class="audit-value">${esc(formatValue(entry.value))}</td>
      <td class="audit-updated-by">${esc(entry.updatedBy)}</td>
      <td class="audit-updated-at">${esc(entry.updatedAt)}</td>
      <td class="audit-operation-id">${esc(entry.operationId)}</td>
    </tr>`,
    )
    .join("\n");

  return `<table class="audit-trail-table" aria-label="Wijzigingsgeschiedenis">
  <thead>
    <tr>
      <th scope="col">Sleutel</th>
      <th scope="col">Nieuwe waarde</th>
      <th scope="col">Door</th>
      <th scope="col">Tijdstip</th>
      <th scope="col">Operatie-ID</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>`;
};

/**
 * Renders the settings tab view as an HTML string.
 *
 * @param viewState - Current async view state for the settings tab.
 * @param options   - Optional form state and locale.
 * @returns         - HTML fragment string ready for insertion.
 */
export const renderSettingsTab = (
  viewState: AdminAsyncViewState<AdminSettingsViewData>,
  options?: RenderSettingsOptions,
): string => {
  if (viewState.status === "loading") {
    return renderLoading();
  }

  if (viewState.status === "error" && !viewState.data) {
    const error = viewState.error ?? { code: "UNKNOWN_ERROR", message: "Onbekende fout." };
    return renderError(error.code, error.message, error.hint);
  }

  const entries = viewState.data?.entries ?? [];
  const audit = viewState.data?.auditTrail ?? [];

  const errorBanner =
    viewState.status === "error" && viewState.error
      ? `<div class="settings-error-banner" role="alert">
    <strong>Fout: ${esc(viewState.error.code)}</strong>
    <p>${esc(viewState.error.message)}${viewState.error.hint ? ` <span class="settings-error-hint">(${esc(viewState.error.hint)})</span>` : ""}</p>
  </div>`
      : "";

  return `<section class="settings-tab">
  <h2 class="settings-heading">Instellingen</h2>
  ${errorBanner}
  <div class="settings-current">
    <h3>Huidige instellingen</h3>
    ${renderSettingsTable(entries)}
  </div>
  <div class="settings-form-section">
    <h3>Instelling wijzigen</h3>
    ${renderUpdateForm(options)}
  </div>
  <div class="settings-audit">
    <h3>Wijzigingsgeschiedenis</h3>
    ${renderAuditTrail(audit)}
  </div>
</section>`;
};

/**
 * Validates raw form input against the settings schema.
 * Returns a validation error message or null if valid.
 */
export const validateSettingsFormInput = (
  key: string,
  rawValue: string,
): string | null => {
  if (!key.trim()) {
    return "Sleutel is verplicht.";
  }

  const schema = SETTINGS_SCHEMA.find((s) => s.key === key);
  if (!schema) {
    return `Configuratiesleutel '${key}' is niet toegestaan.`;
  }

  if (!rawValue.trim()) {
    return "Waarde is verplicht.";
  }

  if (schema.type === "boolean") {
    if (rawValue !== "true" && rawValue !== "false") {
      return "Waarde moet 'true' of 'false' zijn.";
    }
  }

  if (schema.type === "number") {
    if (!Number.isFinite(Number(rawValue))) {
      return "Waarde moet een geldig getal zijn.";
    }
  }

  return null;
};

/**
 * Converts raw form input to a typed config value ready for ConfigUpdateRequest.
 * Assumes validateSettingsFormInput returned null first.
 */
export const parseSettingsFormValue = (key: string, rawValue: string): unknown => {
  const schema = SETTINGS_SCHEMA.find((s) => s.key === key);
  if (!schema) {
    return rawValue;
  }
  if (schema.type === "boolean") {
    return rawValue === "true";
  }
  if (schema.type === "number") {
    return Number(rawValue);
  }
  return rawValue;
};
