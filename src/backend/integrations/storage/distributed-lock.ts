import { closeSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

export interface DistributedLockCoordinator {
  runExclusive<T>(criticalSection: () => T): T;
}

interface FileLeaseLockOptions {
  nowMs?: () => number;
  leaseTtlMs?: number;
  maxWaitMs?: number;
  retryDelayMs?: number;
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
