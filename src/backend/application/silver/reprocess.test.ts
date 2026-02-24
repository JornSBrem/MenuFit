import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";
import { reprocessSilverTransforms } from "./reprocess.ts";

test("silver reprocess persists transform output and stays deterministic", () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-silver-"));
  try {
    const stateStore = new PersistentStateStore(join(dir, "state.json"));
    const inputs = [
      {
        sourceObjectId: "bronze-week-9",
        year: 2026,
        week: 9,
        kcal: 1800,
        basePersons: 2,
        payload: {
          meals: [
            {
              day: "maandag",
              meal: "pasta",
              ingredients: [{ text: "tomaat", amount: "2", unit: "stuk" }],
            },
          ],
          pdfLines: ["tomaat 2 stuk"],
        },
      },
    ];
    const options = {
      transformVersion: "silver-v1",
      canonicalRulesetVersion: "canon-v1",
      synonymDictVersion: "syn-v1",
      stateStore,
    };

    const first = reprocessSilverTransforms(inputs, options);
    const second = reprocessSilverTransforms(inputs, options);

    assert.deepEqual(second, first);
    const persisted = stateStore.read().silverTransforms;
    const keys = Object.keys(persisted);
    assert.equal(keys.length, 1);
    assert.equal(Boolean(persisted["2026:9:1800:2:silver-v1"]), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
