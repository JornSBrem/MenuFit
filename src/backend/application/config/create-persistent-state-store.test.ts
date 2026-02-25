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

test("createPersistentStateStore selects sqlite driver when configured", () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-state-sqlite-path-"));
  try {
    const sqlitePath = join(dir, "state.sqlite");
    const config = createDefaultRuntimeConfig({
      STATE_STORE_DRIVER: "sqlite",
      STATE_STORE_SQLITE_PATH: sqlitePath,
    });

    const store = createPersistentStateStore(config);
    store.update((draft) => {
      draft.auditTrail.push({
        eventId: "audit-1",
        category: "admin",
        action: "smoke",
        resourceId: "res-1",
        actorId: "ops-1",
        outcome: "success",
        createdAt: "2026-02-25T00:00:00.000Z",
      });
    });
    const state = store.read();
    assert.equal(state.auditTrail.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("createPersistentStateStore selects postgres driver when configured", () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-state-postgres-lock-"));
  try {
    const lockPath = join(dir, "state.postgres.lock");
    const config = createDefaultRuntimeConfig({
      STATE_STORE_DRIVER: "postgres",
      STATE_STORE_POSTGRES_URL: "postgres://user:secret@localhost:5432/menufit",
      STATE_STORE_POSTGRES_LOCK_PATH: lockPath,
    });

    const store = createPersistentStateStore(config) as unknown as { driver?: string };
    assert.equal(store.driver, "postgres");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("createPersistentStateStore rejects postgres driver without connection string", () => {
  const config = createDefaultRuntimeConfig({
    STATE_STORE_DRIVER: "postgres",
  });
  assert.throws(
    () => createPersistentStateStore(config),
    /STATE_STORE_POSTGRES_URL is required/u,
  );
});
