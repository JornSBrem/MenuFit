import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createDefaultRuntimeConfig } from "../../../shared/config/index.ts";
import { createPersistentStateStore } from "./create-persistent-state-store.ts";

test("createPersistentStateStore uses STATE_STORE_PATH when configured", () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-state-path-"));
  try {
    const config = createDefaultRuntimeConfig({
      STATE_STORE_PATH: join(dir, "custom-state.json"),
    });

    const store = createPersistentStateStore(config);
    const state = store.read();
    assert.equal(typeof state.schemaVersion, "number");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
