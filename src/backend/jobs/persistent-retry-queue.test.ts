import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { PersistentStateStore } from "../integrations/storage/persistent-state-store.ts";
import { PersistentRetryQueue } from "./persistent-retry-queue.ts";

test("persistent retry queue enqueues claims retries and dead-letters entries", () => {
  let now = 2_000_000_000;
  const queue = new PersistentRetryQueue({
    nowEpochSeconds: () => now,
  });

  const entry = queue.enqueue({
    queueName: "ingest-external",
    payload: { operationId: "ingest-1" },
    maxAttempts: 2,
  });
  assert.equal(entry.entryId, "retry-1");

  const claimed = queue.claimDue("ingest-external");
  assert.equal(claimed?.status, "processing");

  const failed = queue.fail(claimed?.entryId ?? "", new Error("temporary failure"), {
    baseDelaySeconds: 10,
    backoffMultiplier: 2,
  });
  assert.equal(failed.status, "pending");
  assert.equal(failed.attempts, 1);

  now += 9;
  assert.equal(queue.claimDue("ingest-external"), null);

  now += 1;
  const claimedAgain = queue.claimDue("ingest-external");
  assert.equal(claimedAgain?.status, "processing");
  const dead = queue.fail(claimedAgain?.entryId ?? "", new Error("still failing"));
  assert.equal(dead.status, "dead_letter");
  assert.equal(dead.attempts, 2);
});

test("persistent retry queue rehydrates entries across restarts", () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-retry-queue-"));
  try {
    let now = 2_010_000_000;
    const stateStore = new PersistentStateStore(join(dir, "state.json"));

    const first = new PersistentRetryQueue({
      nowEpochSeconds: () => now,
      stateStore,
    });
    first.enqueue({
      queueName: "system-external",
      payload: { operationId: "cleanup-1" },
      maxAttempts: 3,
    });

    const second = new PersistentRetryQueue({
      nowEpochSeconds: () => now,
      stateStore,
    });
    assert.equal(second.list("system-external").length, 1);

    const claimed = second.claimDue("system-external");
    assert.equal(claimed?.entryId, "retry-1");

    now += 1;
    const third = new PersistentRetryQueue({
      nowEpochSeconds: () => now,
      stateStore,
    });
    const next = third.enqueue({
      queueName: "system-external",
      payload: { operationId: "cleanup-2" },
    });
    assert.equal(next.entryId, "retry-2");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
