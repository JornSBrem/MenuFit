import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  ExternalLeaseLockCoordinator,
  FileLeaseLockCoordinator,
  RedisCliLeaseLockClient,
} from "./distributed-lock.ts";

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
    const events: string[] = [];
    writeFileSync(lockPath, JSON.stringify({ pid: 123, expiresAtMs: now - 1_000 }), "utf8");

    const coordinator = new FileLeaseLockCoordinator(lockPath, {
      nowMs: () => now,
      leaseTtlMs: 5_000,
      maxWaitMs: 50,
      retryDelayMs: 1,
      telemetrySink: {
        record: ({ eventType }) => events.push(eventType),
      },
    });

    const value = coordinator.runExclusive(() => {
      now += 1;
      return "ok";
    });
    assert.equal(value, "ok");
    assert.equal(events.includes("stale_reclaim"), true);
    assert.equal(events.includes("acquired"), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("external lease lock coordinator acquires and releases lock via client", () => {
  let lockOwner: string | null = null;
  let releaseCount = 0;
  const coordinator = new ExternalLeaseLockCoordinator(
    "state-store",
    {
      tryAcquire: ({ ownerToken }) => {
        if (lockOwner) {
          return "busy";
        }
        lockOwner = ownerToken;
        return "acquired";
      },
      renew: ({ ownerToken }) => lockOwner === ownerToken,
      release: ({ ownerToken }) => {
        if (lockOwner === ownerToken) {
          lockOwner = null;
          releaseCount += 1;
        }
      },
    },
    { failOpen: false, maxWaitMs: 50, retryDelayMs: 1, renewIntervalMs: 5 },
  );

  const value = coordinator.runExclusive(() => "ok");
  assert.equal(value, "ok");
  assert.equal(releaseCount, 1);
  assert.equal(lockOwner, null);
});

test("external lease lock coordinator supports fail-open fallback on backend errors", () => {
  const coordinator = new ExternalLeaseLockCoordinator(
    "state-store",
    {
      tryAcquire: () => {
        throw new Error("backend unavailable");
      },
      renew: () => true,
      release: () => {},
    },
    { failOpen: true, maxWaitMs: 10, retryDelayMs: 1 },
  );

  const value = coordinator.runExclusive(() => "fallback-ok");
  assert.equal(value, "fallback-ok");
});

test("external lease lock coordinator fails closed when backend is unavailable", () => {
  const coordinator = new ExternalLeaseLockCoordinator(
    "state-store",
    {
      tryAcquire: () => {
        throw new Error("backend unavailable");
      },
      renew: () => true,
      release: () => {},
    },
    { failOpen: false, maxWaitMs: 10, retryDelayMs: 1 },
  );

  assert.throws(() => coordinator.runExclusive(() => "should-not-run"), /backend unavailable/u);
});

test("external lease lock coordinator records timeout telemetry when lock stays busy", () => {
  const events: string[] = [];
  let now = 2_300_000_000_000;
  const coordinator = new ExternalLeaseLockCoordinator(
    "state-store",
    {
      tryAcquire: () => "busy",
      renew: () => true,
      release: () => {},
    },
    {
      failOpen: false,
      maxWaitMs: 5,
      retryDelayMs: 1,
      nowMs: () => {
        now += 2;
        return now;
      },
      telemetrySink: {
        record: ({ eventType }) => events.push(eventType),
      },
      backendName: "redis",
    },
  );

  assert.throws(() => coordinator.runExclusive(() => "nope"), /Could not acquire external distributed lock/u);
  assert.equal(events.includes("timeout"), true);
});

test("redis cli lease lock client issues set/eval commands with expected shape", () => {
  const commands: string[][] = [];
  const commandExecutor = (args: string[]): string => {
    commands.push(args);
    if (args.includes("SET")) {
      return "OK\n";
    }
    return "1\n";
  };

  const client = new RedisCliLeaseLockClient({
    redisUrl: "redis://localhost:6379",
    keyPrefix: "menufit",
    commandExecutor,
  });

  const acquired = client.tryAcquire({
    lockKey: "state-store",
    ownerToken: "owner-1",
    leaseTtlMs: 30_000,
  });
  assert.equal(acquired, "acquired");

  const renewed = client.renew({
    lockKey: "state-store",
    ownerToken: "owner-1",
    leaseTtlMs: 30_000,
  });
  assert.equal(renewed, true);

  client.release({
    lockKey: "state-store",
    ownerToken: "owner-1",
  });

  assert.equal(commands.length, 3);
  assert.equal(commands[0][0], "-u");
  assert.equal(commands[0][1], "redis://localhost:6379");
  assert.equal(commands[0].includes("SET"), true);
  assert.equal(commands[1].includes("EVAL"), true);
  assert.equal(commands[2].includes("EVAL"), true);
  assert.equal(commands[0].includes("menufit:state-store"), true);
});
