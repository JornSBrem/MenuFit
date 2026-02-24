import assert from "node:assert/strict";
import test from "node:test";

import { translateAdmin } from "./index.ts";

test("admin i18n translates NL keys", () => {
  assert.equal(translateAdmin("admin.tab.data"), "Data");
  assert.equal(translateAdmin("admin.status.completed"), "Voltooid");
});

test("admin i18n interpolates template values", () => {
  const translated = translateAdmin("admin.error.with_hint", {
    values: {
      code: "INVALID_BODY",
      message: "Body mist veld",
      hint: "operationId",
    },
  });

  assert.equal(translated, "INVALID_BODY: Body mist veld (operationId)");
});
