import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { FileLeaseLockCoordinator } from "./distributed-lock.ts";

test("file lease lock coordinator runs critical section exclusively", () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-lock-"));
  const lockPath = join(dir, "state.lock");
  try {
    const coordinator = new FileLeaseLockCoordinator(lockPath, {
      nowMs: () => 2_300_000_000_000,
      leaseTtlMs: 10_000,
    });

    let ran = false;
    coordinator.runExclusive(() => {
      ran = true;
    });
    assert.equal(ran, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("file lease lock coordinator reclaims expired lock file", () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-lock-expired-"));
  const lockPath = join(dir, "state.lock");
  try {
    let now = 2_300_000_000_000;
    writeFileSync(lockPath, JSON.stringify({ pid: 123, expiresAtMs: now - 1_000 }), "utf8");

    const coordinator = new FileLeaseLockCoordinator(lockPath, {
      nowMs: () => now,
      leaseTtlMs: 5_000,
      maxWaitMs: 50,
      retryDelayMs: 1,
    });

    const value = coordinator.runExclusive(() => {
      now += 1;
      return "ok";
    });
    assert.equal(value, "ok");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
