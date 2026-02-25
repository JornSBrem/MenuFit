import { closeSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

export interface DistributedLockCoordinator {
  runExclusive<T>(criticalSection: () => T): T;
}

export interface ExternalLeaseLockClient {
  tryAcquire(input: {
    lockKey: string;
    ownerToken: string;
    leaseTtlMs: number;
  }): "acquired" | "busy";
  renew(input: {
    lockKey: string;
    ownerToken: string;
    leaseTtlMs: number;
  }): boolean;
  release(input: {
    lockKey: string;
    ownerToken: string;
  }): void;
}

interface FileLeaseLockOptions {
  nowMs?: () => number;
  leaseTtlMs?: number;
  maxWaitMs?: number;
  retryDelayMs?: number;
}

interface ExternalLeaseLockOptions {
  nowMs?: () => number;
  leaseTtlMs?: number;
  renewIntervalMs?: number;
  maxWaitMs?: number;
  retryDelayMs?: number;
  failOpen?: boolean;
}

type RedisCliCommandExecutor = (args: string[]) => string;

interface RedisCliLeaseLockClientOptions {
  redisUrl: string;
  keyPrefix?: string;
  commandExecutor?: RedisCliCommandExecutor;
}

const sleepBlocking = (ms: number): void => {
  if (ms <= 0) {
    return;
  }
  const array = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(array, 0, 0, ms);
};

const parseLeaseExpiresAt = (content: string): number | null => {
  const parsed = JSON.parse(content) as Record<string, unknown>;
  const expiresAtMs = parsed.expiresAtMs;
  return typeof expiresAtMs === "number" && Number.isFinite(expiresAtMs) ? expiresAtMs : null;
};

export class ExternalLeaseLockCoordinator implements DistributedLockCoordinator {
  private readonly client: ExternalLeaseLockClient;

  private readonly lockKey: string;

  private readonly nowMs: () => number;

  private readonly leaseTtlMs: number;

  private readonly renewIntervalMs: number;

  private readonly maxWaitMs: number;

  private readonly retryDelayMs: number;

  private readonly failOpen: boolean;

  constructor(
    lockKey: string,
    client: ExternalLeaseLockClient,
    options?: ExternalLeaseLockOptions,
  ) {
    this.lockKey = lockKey;
    this.client = client;
    this.nowMs = options?.nowMs ?? Date.now;
    this.leaseTtlMs = options?.leaseTtlMs ?? 30_000;
    this.renewIntervalMs = options?.renewIntervalMs ?? 10_000;
    this.maxWaitMs = options?.maxWaitMs ?? 5_000;
    this.retryDelayMs = options?.retryDelayMs ?? 50;
    this.failOpen = options?.failOpen ?? true;
  }

  runExclusive<T>(criticalSection: () => T): T {
    const ownerToken = randomUUID();
    const acquired = this.acquire(ownerToken);
    if (!acquired) {
      if (this.failOpen) {
        return criticalSection();
      }
      throw new Error("Could not acquire external distributed lock within max wait window.");
    }

    let renewError: Error | undefined;
    const renewTimer = setInterval(() => {
      try {
        const renewed = this.client.renew({
          lockKey: this.lockKey,
          ownerToken,
          leaseTtlMs: this.leaseTtlMs,
        });
        if (!renewed) {
          renewError = new Error("External lease lock renewal rejected.");
        }
      } catch (error) {
        renewError =
          error instanceof Error
            ? error
            : new Error(`External lease lock renewal failed: ${String(error)}`);
      }
    }, this.renewIntervalMs);
    renewTimer.unref?.();

    try {
      const result = criticalSection();
      if (renewError && !this.failOpen) {
        throw renewError;
      }
      return result;
    } finally {
      clearInterval(renewTimer);
      try {
        this.client.release({ lockKey: this.lockKey, ownerToken });
      } catch (error) {
        if (!this.failOpen) {
          throw error;
        }
      }
    }
  }

  private acquire(ownerToken: string): boolean {
    const startedAtMs = this.nowMs();
    while (this.nowMs() - startedAtMs <= this.maxWaitMs) {
      try {
        const result = this.client.tryAcquire({
          lockKey: this.lockKey,
          ownerToken,
          leaseTtlMs: this.leaseTtlMs,
        });
        if (result === "acquired") {
          return true;
        }
      } catch (error) {
        if (this.failOpen) {
          return false;
        }
        throw error;
      }

      sleepBlocking(this.retryDelayMs);
    }
    return false;
  }
}

export class RedisCliLeaseLockClient implements ExternalLeaseLockClient {
  private readonly redisUrl: string;

  private readonly keyPrefix: string;

  private readonly commandExecutor: RedisCliCommandExecutor;

  constructor(options: RedisCliLeaseLockClientOptions) {
    this.redisUrl = options.redisUrl.trim();
    this.keyPrefix = options.keyPrefix?.trim() || "menufit:locks";
    this.commandExecutor = options.commandExecutor ?? this.executeRedisCommand;
  }

  tryAcquire(input: {
    lockKey: string;
    ownerToken: string;
    leaseTtlMs: number;
  }): "acquired" | "busy" {
    const key = this.toRedisKey(input.lockKey);
    const output = this.commandExecutor([
      "-u",
      this.redisUrl,
      "--raw",
      "SET",
      key,
      input.ownerToken,
      "NX",
      "PX",
      String(input.leaseTtlMs),
    ]);
    return output.trim() === "OK" ? "acquired" : "busy";
  }

  renew(input: {
    lockKey: string;
    ownerToken: string;
    leaseTtlMs: number;
  }): boolean {
    const key = this.toRedisKey(input.lockKey);
    const script =
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('PEXPIRE', KEYS[1], ARGV[2]) else return 0 end";
    const output = this.commandExecutor([
      "-u",
      this.redisUrl,
      "--raw",
      "EVAL",
      script,
      "1",
      key,
      input.ownerToken,
      String(input.leaseTtlMs),
    ]);
    return output.trim() === "1";
  }

  release(input: { lockKey: string; ownerToken: string }): void {
    const key = this.toRedisKey(input.lockKey);
    const script =
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end";
    this.commandExecutor([
      "-u",
      this.redisUrl,
      "--raw",
      "EVAL",
      script,
      "1",
      key,
      input.ownerToken,
    ]);
  }

  private toRedisKey(lockKey: string): string {
    return `${this.keyPrefix}:${lockKey}`;
  }

  private executeRedisCommand(args: string[]): string {
    const result = spawnSync("redis-cli", args, { encoding: "utf8" });
    if (result.status !== 0) {
      throw new Error(result.stderr?.trim() || "redis-cli command failed.");
    }
    return result.stdout ?? "";
  }
}

export class FileLeaseLockCoordinator implements DistributedLockCoordinator {
  private readonly lockPath: string;

  private readonly nowMs: () => number;

  private readonly leaseTtlMs: number;

  private readonly maxWaitMs: number;

  private readonly retryDelayMs: number;

  constructor(lockPath: string, options?: FileLeaseLockOptions) {
    this.lockPath = lockPath;
    this.nowMs = options?.nowMs ?? Date.now;
    this.leaseTtlMs = options?.leaseTtlMs ?? 30_000;
    this.maxWaitMs = options?.maxWaitMs ?? 5_000;
    this.retryDelayMs = options?.retryDelayMs ?? 50;
  }

  runExclusive<T>(criticalSection: () => T): T {
    const acquired = this.acquire();
    if (!acquired) {
      throw new Error("Could not acquire distributed lock within max wait window.");
    }

    try {
      return criticalSection();
    } finally {
      this.release();
    }
  }

  private acquire(): boolean {
    mkdirSync(dirname(this.lockPath), { recursive: true });
    const startedAtMs = this.nowMs();

    while (this.nowMs() - startedAtMs <= this.maxWaitMs) {
      const expiresAtMs = this.nowMs() + this.leaseTtlMs;
      try {
        const fd = openSync(this.lockPath, "wx");
        writeFileSync(fd, JSON.stringify({ pid: process.pid, expiresAtMs }), "utf8");
        closeSync(fd);
        return true;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "EEXIST") {
          throw error;
        }

        if (this.isLeaseExpired()) {
          rmSync(this.lockPath, { force: true });
          continue;
        }

        sleepBlocking(this.retryDelayMs);
      }
    }

    return false;
  }

  private release(): void {
    rmSync(this.lockPath, { force: true });
  }

  private isLeaseExpired(): boolean {
    try {
      const raw = readFileSync(this.lockPath, "utf8");
      const expiresAtMs = parseLeaseExpiresAt(raw);
      if (expiresAtMs === null) {
        return true;
      }
      return expiresAtMs <= this.nowMs();
    } catch {
      return true;
    }
  }
}
