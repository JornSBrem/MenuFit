import assert from "node:assert/strict";
import test from "node:test";

import type { AdminAsyncViewState, AdminSettingsViewData } from "../types.ts";
import {
  renderSettingsTab,
  validateSettingsFormInput,
  parseSettingsFormValue,
  SETTINGS_SCHEMA,
} from "./settings-renderer.ts";

// --- Helpers ---

const emptyView = (): AdminAsyncViewState<AdminSettingsViewData> => ({
  status: "empty",
  data: { entries: [], auditTrail: [] },
});

const successView = (
  overrides?: Partial<AdminSettingsViewData>,
): AdminAsyncViewState<AdminSettingsViewData> => ({
  status: "success",
  data: {
    entries: [
      { key: "feature.toggle", value: true, updatedAt: "2026-02-25T10:00:00.000Z", updatedBy: "admin-1" },
    ],
    auditTrail: [
      { operationId: "op-1", key: "feature.toggle", value: true, updatedAt: "2026-02-25T10:00:00.000Z", updatedBy: "admin-1" },
    ],
    ...overrides,
  },
});

const loadingView = (): AdminAsyncViewState<AdminSettingsViewData> => ({
  status: "loading",
});

const errorView = (hint?: string): AdminAsyncViewState<AdminSettingsViewData> => ({
  status: "error",
  error: { code: "API_ERROR", message: "Something went wrong.", hint },
});

// --- renderSettingsTab ---

test("renderSettingsTab loading state shows loading indicator", () => {
  const html = renderSettingsTab(loadingView());
  assert.ok(html.includes("settings-tab--loading"));
  assert.ok(html.includes("aria-busy=\"true\""));
  assert.ok(html.includes("Instellingen laden"));
});

test("renderSettingsTab error state without data shows error section", () => {
  const html = renderSettingsTab(errorView());
  assert.ok(html.includes("settings-tab--error"));
  assert.ok(html.includes("API_ERROR"));
  assert.ok(html.includes("Something went wrong."));
});

test("renderSettingsTab error state with hint shows hint", () => {
  const html = renderSettingsTab(errorView("Check the logs."));
  assert.ok(html.includes("Check the logs."));
  assert.ok(html.includes("settings-error-hint"));
});

test("renderSettingsTab empty state shows empty message and form", () => {
  const html = renderSettingsTab(emptyView());
  assert.ok(html.includes("settings-tab"));
  assert.ok(html.includes("Instellingen"));
  assert.ok(html.includes("Nog geen instellingen geconfigureerd."));
  assert.ok(html.includes("settings-update-form"));
  assert.ok(html.includes("Nog geen configuratiewijzigingen vastgelegd."));
});

test("renderSettingsTab success state shows entries table", () => {
  const html = renderSettingsTab(successView());
  assert.ok(html.includes("settings-table"));
  assert.ok(html.includes("feature.toggle"));
  assert.ok(html.includes("Ja"));
  assert.ok(html.includes("admin-1"));
});

test("renderSettingsTab success state shows audit trail table", () => {
  const html = renderSettingsTab(successView());
  assert.ok(html.includes("audit-trail-table"));
  assert.ok(html.includes("op-1"));
});

test("renderSettingsTab audit trail is rendered in reverse order (most recent first)", () => {
  const view = successView({
    auditTrail: [
      { operationId: "op-1", key: "a", value: 1, updatedAt: "t1", updatedBy: "u1" },
      { operationId: "op-2", key: "b", value: 2, updatedAt: "t2", updatedBy: "u2" },
    ],
  });
  const html = renderSettingsTab(view);
  const op1Pos = html.indexOf("op-1");
  const op2Pos = html.indexOf("op-2");
  assert.ok(op2Pos < op1Pos, "op-2 (most recent) should appear before op-1 in reversed audit trail");
});

test("renderSettingsTab form has all allowed config keys in select", () => {
  const html = renderSettingsTab(emptyView());
  for (const schema of SETTINGS_SCHEMA) {
    assert.ok(html.includes(`value="${schema.key}"`), `Missing key: ${schema.key}`);
  }
});

test("renderSettingsTab form pre-selects key from formState", () => {
  const html = renderSettingsTab(emptyView(), {
    formState: { key: "llm.model", rawValue: "gpt-4" },
  });
  assert.ok(html.includes('value="llm.model" selected="selected"'));
  assert.ok(html.includes('value="gpt-4"'));
});

test("renderSettingsTab form shows boolean select for boolean key", () => {
  const html = renderSettingsTab(emptyView(), {
    formState: { key: "feature.toggle", rawValue: "true" },
  });
  assert.ok(html.includes('data-value-type="boolean"'));
  assert.ok(html.includes('<select'));
  assert.ok(html.includes('value="true" selected="selected"'));
});

test("renderSettingsTab form shows number input for number key", () => {
  const html = renderSettingsTab(emptyView(), {
    formState: { key: "matching.highConfidenceMin", rawValue: "0.9" },
  });
  assert.ok(html.includes('data-value-type="number"'));
  assert.ok(html.includes('type="number"'));
  assert.ok(html.includes('value="0.9"'));
});

test("renderSettingsTab form shows string input for string key", () => {
  const html = renderSettingsTab(emptyView(), {
    formState: { key: "llm.provider", rawValue: "openai" },
  });
  assert.ok(html.includes('data-value-type="string"'));
  assert.ok(html.includes('type="text"'));
  assert.ok(html.includes('value="openai"'));
});

test("renderSettingsTab shows inline validation error from formState", () => {
  const html = renderSettingsTab(emptyView(), {
    formState: {
      key: "feature.toggle",
      rawValue: "",
      validationError: "Waarde is verplicht.",
    },
  });
  assert.ok(html.includes("settings-form-error"));
  assert.ok(html.includes("Waarde is verplicht."));
});

test("renderSettingsTab shows confirmation banner after successful update", () => {
  const html = renderSettingsTab(successView(), {
    formState: {
      key: "feature.toggle",
      rawValue: "true",
      confirmedKey: "feature.toggle",
    },
  });
  assert.ok(html.includes("settings-form-confirmation"));
  assert.ok(html.includes("succesvol bijgewerkt"));
  assert.ok(html.includes("feature.toggle"));
});

test("renderSettingsTab escapes XSS in setting values", () => {
  const view = successView({
    entries: [
      { key: "llm.model", value: '<script>alert("xss")</script>', updatedAt: "t", updatedBy: "a" },
    ],
  });
  const html = renderSettingsTab(view);
  assert.ok(!html.includes("<script>"), "raw <script> must not appear in output");
  assert.ok(html.includes("&lt;script&gt;"), "script must be escaped");
});

test("renderSettingsTab escapes XSS in error messages", () => {
  const view: AdminAsyncViewState<AdminSettingsViewData> = {
    status: "error",
    error: { code: "ERR", message: '<img src=x onerror="alert(1)">' },
  };
  const html = renderSettingsTab(view);
  assert.ok(!html.includes('<img'), "raw <img> must not appear in error output");
});

// --- validateSettingsFormInput ---

test("validateSettingsFormInput returns error for empty key", () => {
  const result = validateSettingsFormInput("", "true");
  assert.equal(result, "Sleutel is verplicht.");
});

test("validateSettingsFormInput returns error for unknown key", () => {
  const result = validateSettingsFormInput("unknown.key", "value");
  assert.ok(result?.includes("niet toegestaan"));
});

test("validateSettingsFormInput returns error for empty value", () => {
  const result = validateSettingsFormInput("feature.toggle", "");
  assert.equal(result, "Waarde is verplicht.");
});

test("validateSettingsFormInput returns error for invalid boolean value", () => {
  const result = validateSettingsFormInput("feature.toggle", "yes");
  assert.ok(result?.includes("true"));
});

test("validateSettingsFormInput returns error for invalid number value", () => {
  const result = validateSettingsFormInput("matching.highConfidenceMin", "not-a-number");
  assert.ok(result?.includes("getal"));
});

test("validateSettingsFormInput returns null for valid boolean true", () => {
  assert.equal(validateSettingsFormInput("feature.toggle", "true"), null);
});

test("validateSettingsFormInput returns null for valid boolean false", () => {
  assert.equal(validateSettingsFormInput("feature.toggle", "false"), null);
});

test("validateSettingsFormInput returns null for valid number", () => {
  assert.equal(validateSettingsFormInput("matching.autoAcceptMin", "0.75"), null);
});

test("validateSettingsFormInput returns null for valid string", () => {
  assert.equal(validateSettingsFormInput("llm.model", "gpt-4o"), null);
});

// --- parseSettingsFormValue ---

test("parseSettingsFormValue converts 'true' to boolean true", () => {
  assert.equal(parseSettingsFormValue("feature.toggle", "true"), true);
});

test("parseSettingsFormValue converts 'false' to boolean false", () => {
  assert.equal(parseSettingsFormValue("feature.toggle", "false"), false);
});

test("parseSettingsFormValue converts number string to number", () => {
  assert.equal(parseSettingsFormValue("matching.highConfidenceMin", "0.9"), 0.9);
});

test("parseSettingsFormValue keeps string as string", () => {
  assert.equal(parseSettingsFormValue("llm.model", "gpt-4o"), "gpt-4o");
});

test("parseSettingsFormValue returns raw value for unknown key", () => {
  assert.equal(parseSettingsFormValue("unknown.key", "raw"), "raw");
});
