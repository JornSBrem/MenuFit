import assert from "node:assert/strict";
import test from "node:test";

import {
  formatAdminErrorLabel,
  getAdminOperationStatusLabel,
  getAdminOperationTypeLabel,
  getAdminPendingLabel,
  getAdminTabLabel,
} from "./admin-labels.ts";

test("admin labels map tabs and operation metadata to localized text", () => {
  assert.equal(getAdminTabLabel("settings"), "Instellingen");
  assert.equal(getAdminOperationTypeLabel("config_update"), "Configuratie-update");
  assert.equal(getAdminOperationStatusLabel("dry_run"), "Dry-run");
  assert.equal(getAdminPendingLabel(true), "Bezig...");
});

test("admin labels format API error with and without hint", () => {
  assert.equal(
    formatAdminErrorLabel({ code: "FORBIDDEN", message: "Geen toegang" }),
    "FORBIDDEN: Geen toegang",
  );

  assert.equal(
    formatAdminErrorLabel({
      code: "INVALID_BODY",
      message: "Body is ongeldig",
      hint: "week is verplicht",
    }),
    "INVALID_BODY: Body is ongeldig (week is verplicht)",
  );
});
