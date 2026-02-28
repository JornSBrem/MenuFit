import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  CURRENT_STATE_SCHEMA_VERSION,
  PersistentStateStore,
} from "./persistent-state-store.ts";

const withTempStateFile = (run: (stateFile: string) => void): void => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-state-"));
  const stateFile = join(dir, "state.json");
  try {
    run(stateFile);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const createMockPostgresExec = (): {
  exec: (sql: string) => string;
  calls: string[];
} => {
  let encodedPayload = "";
  const calls: string[] = [];
  return {
    exec: (sql) => {
      calls.push(sql);
      if (sql.includes("CREATE TABLE IF NOT EXISTS")) {
        return "";
      }
      if (sql.includes("SELECT encode(convert_to")) {
        return encodedPayload.length > 0 ? `${encodedPayload}\n` : "";
      }
      if (sql.includes("INSERT INTO menufit_state_store")) {
        const match = sql.match(/decode\('([^']+)'/u);
        encodedPayload = match?.[1] ?? "";
        return "";
      }
      return "";
    },
    calls,
  };
};

test("persistent state store creates default state when file does not exist", () => {
  withTempStateFile((stateFile) => {
    const store = new PersistentStateStore(stateFile);
    const state = store.read();
    assert.equal(state.schemaVersion, CURRENT_STATE_SCHEMA_VERSION);
    assert.deepEqual(state.goldReadModels, {});
    assert.deepEqual(state.silverTransforms, {});
    assert.deepEqual(state.systemJobs, []);
    assert.deepEqual(state.households, []);
    assert.deepEqual(state.householdInvitations, []);
    assert.deepEqual(state.authSessions, []);
    assert.deepEqual(state.providerSessions, []);
    assert.deepEqual(state.schedulerRuns, []);
    assert.deepEqual(state.retryQueueEntries, []);
  });
});

test("persistent state store migrates legacy schema to current schema", () => {
  withTempStateFile((stateFile) => {
    writeFileSync(
      stateFile,
      JSON.stringify(
        {
          gold: {
            "2026:9:1800:2": {
              weekPlan: {
                weekPlanId: "weekplan-9",
                year: 2026,
                week: 9,
                kcal: 1800,
                basePersons: 2,
                mealCount: 7,
                sourceObjectId: "bronze-9",
                transformVersion: "gold-v1",
                generatedAt: "2026-02-25T00:00:00.000Z",
              },
              groceries: [],
              groceryReconcile: [],
              matchStatus: {
                totalItems: 0,
                resolvedItems: 0,
                unresolvedItems: 0,
                coverageScore: 1,
              },
              cartPlan: {
                cartPlanId: "cartplan-9",
                weekPlanId: "weekplan-9",
                itemCount: 0,
                unresolvedCount: 0,
                generatedAt: "2026-02-25T00:00:00.000Z",
              },
            },
          },
          jobs: [{ jobId: "system-job-1" }],
        },
        null,
        2,
      ),
      "utf8",
    );

    const store = new PersistentStateStore(stateFile);
    const state = store.read();
    assert.equal(state.schemaVersion, CURRENT_STATE_SCHEMA_VERSION);
    assert.equal(Object.keys(state.goldReadModels).length, 1);
    assert.equal(state.systemJobs.length, 1);
    assert.deepEqual(state.cartReportsByIdempotencyKey, {});
    assert.deepEqual(state.households, []);
    assert.deepEqual(state.householdInvitations, []);
    assert.deepEqual(state.authSessions, []);
    assert.deepEqual(state.providerSessions, []);
    assert.deepEqual(state.schedulerRuns, []);
    assert.deepEqual(state.retryQueueEntries, []);
  });
});

test("persistent state store migrates v1 schema to current auth fields", () => {
  withTempStateFile((stateFile) => {
    writeFileSync(
      stateFile,
      JSON.stringify(
        {
          schemaVersion: 1,
          silverTransforms: {},
          goldReadModels: {},
          cartReportsByIdempotencyKey: {},
          systemJobs: [],
          systemReports: [],
          matchingQueue: [],
          matchingAuditTrail: [],
          matchingOverrides: [],
          auditTrail: [],
          updatedAt: "2026-02-25T00:00:00.000Z",
        },
        null,
        2,
      ),
      "utf8",
    );

    const store = new PersistentStateStore(stateFile);
    const state = store.read();

    assert.equal(state.schemaVersion, CURRENT_STATE_SCHEMA_VERSION);
    assert.deepEqual(state.households, []);
    assert.deepEqual(state.householdInvitations, []);
    assert.deepEqual(state.authSessions, []);
    assert.deepEqual(state.providerSessions, []);
    assert.deepEqual(state.schedulerRuns, []);
    assert.deepEqual(state.retryQueueEntries, []);

    const persisted = JSON.parse(readFileSync(stateFile, "utf8")) as { schemaVersion?: number };
    assert.equal(persisted.schemaVersion, CURRENT_STATE_SCHEMA_VERSION);
  });
});

test("persistent state store migrates v2 schema to current auth/scheduler fields", () => {
  withTempStateFile((stateFile) => {
    writeFileSync(
      stateFile,
      JSON.stringify(
        {
          schemaVersion: 2,
          silverTransforms: {},
          goldReadModels: {},
          cartReportsByIdempotencyKey: {},
          systemJobs: [],
          systemReports: [],
          matchingQueue: [],
          matchingAuditTrail: [],
          matchingOverrides: [],
          auditTrail: [],
          households: [],
          householdInvitations: [],
          updatedAt: "2026-02-25T00:00:00.000Z",
        },
        null,
        2,
      ),
      "utf8",
    );

    const store = new PersistentStateStore(stateFile);
    const state = store.read();

    assert.equal(state.schemaVersion, CURRENT_STATE_SCHEMA_VERSION);
    assert.deepEqual(state.authSessions, []);
    assert.deepEqual(state.providerSessions, []);
    assert.deepEqual(state.schedulerRuns, []);
    assert.deepEqual(state.retryQueueEntries, []);
  });
});

test("persistent state store migrates v3 schema to current scheduler fields", () => {
  withTempStateFile((stateFile) => {
    writeFileSync(
      stateFile,
      JSON.stringify(
        {
          schemaVersion: 3,
          silverTransforms: {},
          goldReadModels: {},
          cartReportsByIdempotencyKey: {},
          systemJobs: [],
          systemReports: [],
          matchingQueue: [],
          matchingAuditTrail: [],
          matchingOverrides: [],
          auditTrail: [],
          households: [],
          householdInvitations: [],
          authSessions: [],
          providerSessions: [],
          updatedAt: "2026-02-25T00:00:00.000Z",
        },
        null,
        2,
      ),
      "utf8",
    );

    const store = new PersistentStateStore(stateFile);
    const state = store.read();

    assert.equal(state.schemaVersion, CURRENT_STATE_SCHEMA_VERSION);
    assert.deepEqual(state.schedulerRuns, []);
    assert.deepEqual(state.retryQueueEntries, []);
  });
});

test("persistent state store update writes to disk", () => {
  withTempStateFile((stateFile) => {
    const store = new PersistentStateStore(stateFile);
    store.update((draft) => {
      draft.cartReportsByIdempotencyKey["idem-1"] = {
        reportId: "cart-sync-1",
        idempotencyKey: "idem-1",
        weekPlanId: "weekplan-9",
        householdId: "house-1",
        source: "user",
        mode: "execute",
        status: "synced",
        itemCount: 1,
        syncedCount: 1,
        failedCount: 0,
        idempotentReplay: false,
        message: "ok",
        createdAt: "2026-02-25T00:00:00.000Z",
      };
    });

    const raw = JSON.parse(readFileSync(stateFile, "utf8")) as { cartReportsByIdempotencyKey?: Record<string, unknown> };
    assert.equal(Boolean(raw.cartReportsByIdempotencyKey?.["idem-1"]), true);
  });
});

test("persistent state store supports sqlite runtime persistence", () => {
  withTempStateFile((_unused) => {
    const sqlitePath = join(tmpdir(), `menufit-state-sqlite-${Date.now()}.sqlite`);
    try {
      const store = new PersistentStateStore(sqlitePath, { driver: "sqlite" });
      store.update((draft) => {
        draft.systemJobs.push({
          jobId: "system-job-1",
          operationId: "backup-1",
          operationType: "backup",
          mode: "dry-run",
          status: "completed",
          startedAt: "2026-02-25T00:00:00.000Z",
          finishedAt: "2026-02-25T00:00:01.000Z",
          actorId: "ops-1",
          message: "backup done",
        });
      });

      const reloaded = new PersistentStateStore(sqlitePath, { driver: "sqlite" });
      assert.equal(reloaded.read().systemJobs.length, 1);
    } finally {
      rmSync(sqlitePath, { force: true });
    }
  });
});

test("persistent state store supports postgres runtime persistence", () => {
  const mock = createMockPostgresExec();
  const store = new PersistentStateStore("out/v3/state/postgres.lock", {
    driver: "postgres",
    postgresConnectionString: "postgres://user:secret@localhost:5432/menufit",
    postgresExec: mock.exec,
  });
  store.update((draft) => {
    draft.systemJobs.push({
      jobId: "system-job-1",
      operationId: "backup-1",
      operationType: "backup",
      mode: "dry-run",
      status: "completed",
      startedAt: "2026-02-25T00:00:00.000Z",
      finishedAt: "2026-02-25T00:00:01.000Z",
      actorId: "ops-1",
      message: "postgres write",
    });
  });

  const reloaded = new PersistentStateStore("out/v3/state/postgres.lock", {
    driver: "postgres",
    postgresConnectionString: "postgres://user:secret@localhost:5432/menufit",
    postgresExec: mock.exec,
  });
  assert.equal(reloaded.read().systemJobs.length, 1);
  assert.equal(
    mock.calls.some((sql) => sql.includes("INSERT INTO menufit_state_store")),
    true,
  );
});

test("postgres driver handles multi-line base64 output from psql (76-char wrapping)", () => {
  // PostgreSQL encode(…,'base64') wraps output at 76 characters.
  // Simulate this in the mock to confirm the reader joins all lines.
  let encodedPayload = "";
  const calls: string[] = [];
  const wrapBase64 = (b64: string): string => {
    const lines: string[] = [];
    for (let i = 0; i < b64.length; i += 76) {
      lines.push(b64.slice(i, i + 76));
    }
    return lines.join("\n");
  };
  const mockExec = (sql: string): string => {
    calls.push(sql);
    if (sql.includes("CREATE TABLE IF NOT EXISTS")) return "";
    if (sql.includes("SELECT encode(convert_to")) {
      return encodedPayload.length > 0 ? `${wrapBase64(encodedPayload)}\n` : "";
    }
    if (sql.includes("INSERT INTO menufit_state_store")) {
      const match = sql.match(/decode\('([^']+)'/u);
      encodedPayload = match?.[1] ?? "";
      return "";
    }
    return "";
  };

  const store = new PersistentStateStore("out/v3/state/postgres-ml.lock", {
    driver: "postgres",
    postgresConnectionString: "postgres://user:secret@localhost:5432/menufit",
    postgresExec: mockExec,
  });

  // Write state with enough data to produce multi-line base64
  store.update((draft) => {
    draft.userAccounts.push({
      userId: "user-abc123",
      username: "testuser",
      passwordHash: "scrypt:aaaaaaaaaaaaaaaa:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      createdAt: "2026-02-28T10:00:00.000Z",
      updatedAt: "2026-02-28T10:00:00.000Z",
    });
  });

  // Create a new store instance to force a fresh read from "postgres"
  const reloaded = new PersistentStateStore("out/v3/state/postgres-ml.lock", {
    driver: "postgres",
    postgresConnectionString: "postgres://user:secret@localhost:5432/menufit",
    postgresExec: mockExec,
  });
  const state = reloaded.read();
  assert.equal(state.userAccounts.length, 1);
  assert.equal(state.userAccounts[0].username, "testuser");
});

test("postgres driver requires connection string when no command executor is injected", () => {
  const store = new PersistentStateStore("out/v3/state/postgres.lock", {
    driver: "postgres",
  });
  assert.throws(() => store.read(), /STATE_STORE_POSTGRES_URL/u);
});

test("persistent sqlite store migrates legacy schema version to current", () => {
  const sqlitePath = join(tmpdir(), `menufit-state-legacy-${Date.now()}.sqlite`);
  try {
    const db = new DatabaseSync(sqlitePath);
    db.exec(`
      CREATE TABLE state_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE state_records (
        collection TEXT NOT NULL,
        record_key TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        PRIMARY KEY (collection, record_key)
      );
    `);
    db.prepare("INSERT INTO state_meta(key, value) VALUES (?, ?)").run("schemaVersion", "1");
    db.prepare("INSERT INTO state_meta(key, value) VALUES (?, ?)").run("updatedAt", "2026-02-25T00:00:00.000Z");
    db.close();

    const store = new PersistentStateStore(sqlitePath, { driver: "sqlite" });
    const state = store.read();
    assert.equal(state.schemaVersion, CURRENT_STATE_SCHEMA_VERSION);
    assert.deepEqual(state.authSessions, []);
    assert.deepEqual(state.schedulerRuns, []);
    assert.deepEqual(state.retryQueueEntries, []);
  } finally {
    rmSync(sqlitePath, { force: true });
  }
});

test("persistent state store update avoids stale-cache overwrite across instances (file driver)", () => {
  withTempStateFile((stateFile) => {
    const first = new PersistentStateStore(stateFile);
    const second = new PersistentStateStore(stateFile);

    // Prime first instance cache so stale-cache overwrite would happen without fresh read in update.
    first.read();

    second.update((draft) => {
      draft.auditTrail.push({
        eventId: "audit-b",
        category: "system",
        action: "second-write",
        outcome: "success",
        createdAt: "2026-02-25T00:00:00.000Z",
      });
    });

    first.update((draft) => {
      draft.auditTrail.push({
        eventId: "audit-a",
        category: "system",
        action: "first-write",
        outcome: "success",
        createdAt: "2026-02-25T00:00:01.000Z",
      });
    });

    const finalState = new PersistentStateStore(stateFile).read();
    assert.equal(finalState.auditTrail.length, 2);
    assert.equal(finalState.auditTrail.some((event) => event.eventId === "audit-a"), true);
    assert.equal(finalState.auditTrail.some((event) => event.eventId === "audit-b"), true);
  });
});

test("persistent state store update avoids stale-cache overwrite across instances (sqlite driver)", () => {
  const sqlitePath = join(tmpdir(), `menufit-state-race-${Date.now()}.sqlite`);
  try {
    const first = new PersistentStateStore(sqlitePath, { driver: "sqlite" });
    const second = new PersistentStateStore(sqlitePath, { driver: "sqlite" });

    first.read();

    second.update((draft) => {
      draft.systemReports.push({
        reportId: "report-b",
        jobId: "job-b",
        operationId: "op-b",
        operationType: "backup",
        mode: "dry-run",
        status: "success",
        createdAt: "2026-02-25T00:00:00.000Z",
        actorId: "ops-2",
        target: "db/v3.sqlite",
        logs: [],
      });
    });

    first.update((draft) => {
      draft.systemReports.push({
        reportId: "report-a",
        jobId: "job-a",
        operationId: "op-a",
        operationType: "cleanup",
        mode: "execute",
        status: "success",
        createdAt: "2026-02-25T00:00:01.000Z",
        actorId: "ops-1",
        target: "out/v3/tmp",
        logs: [],
      });
    });

    const finalState = new PersistentStateStore(sqlitePath, { driver: "sqlite" }).read();
    assert.equal(finalState.systemReports.length, 2);
    assert.equal(finalState.systemReports.some((report) => report.reportId === "report-a"), true);
    assert.equal(finalState.systemReports.some((report) => report.reportId === "report-b"), true);
  } finally {
    rmSync(sqlitePath, { force: true });
  }
});
