import type { PersistentStateStore } from "../integrations/storage/persistent-state-store.ts";
import type { RetryQueueEntryRecord } from "./types.ts";

interface PersistentRetryQueueOptions {
  nowEpochSeconds?: () => number;
  stateStore?: PersistentStateStore;
}

export class RetryQueueError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RetryQueueError";
    this.code = code;
  }
}

const assertNonEmpty = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new RetryQueueError("INVALID_INPUT", `${field} is required.`);
  }
  return normalized;
};

export class PersistentRetryQueue {
  private readonly entriesById = new Map<string, RetryQueueEntryRecord>();

  private entrySequence = 0;

  private readonly nowEpochSeconds: () => number;

  private readonly stateStore?: PersistentStateStore;

  constructor(options?: PersistentRetryQueueOptions) {
    this.nowEpochSeconds = options?.nowEpochSeconds ?? (() => Math.floor(Date.now() / 1000));
    this.stateStore = options?.stateStore;

    if (this.stateStore) {
      const persisted = this.stateStore.read().retryQueueEntries;
      for (const entry of persisted) {
        this.entriesById.set(entry.entryId, structuredClone(entry));
        this.entrySequence = Math.max(this.entrySequence, this.parseSequence(entry.entryId));
      }
    }
  }

  enqueue(input: {
    queueName: string;
    payload: Record<string, unknown>;
    maxAttempts?: number;
    notBeforeEpochSeconds?: number;
  }): RetryQueueEntryRecord {
    const queueName = assertNonEmpty(input.queueName, "queueName");
    const maxAttempts = input.maxAttempts ?? 3;
    if (!Number.isInteger(maxAttempts) || maxAttempts <= 0) {
      throw new RetryQueueError("INVALID_MAX_ATTEMPTS", "maxAttempts must be a positive integer.");
    }

    const now = this.nowEpochSeconds();
    const entry: RetryQueueEntryRecord = {
      entryId: this.nextEntryId(),
      queueName,
      status: "pending",
      attempts: 0,
      maxAttempts,
      notBeforeEpochSeconds: input.notBeforeEpochSeconds ?? now,
      payload: structuredClone(input.payload),
      createdAtEpochSeconds: now,
      updatedAtEpochSeconds: now,
    };

    this.entriesById.set(entry.entryId, entry);
    this.persist();
    return structuredClone(entry);
  }

  claimDue(queueName: string): RetryQueueEntryRecord | null {
    const normalizedQueue = assertNonEmpty(queueName, "queueName");
    const now = this.nowEpochSeconds();

    const candidate = this.list(queueName).find(
      (entry) =>
        entry.status === "pending" && entry.notBeforeEpochSeconds <= now,
    );
    if (!candidate) {
      return null;
    }

    const existing = this.entriesById.get(candidate.entryId);
    if (!existing) {
      return null;
    }

    existing.status = "processing";
    existing.updatedAtEpochSeconds = now;
    this.persist();
    return structuredClone(existing);
  }

  complete(entryId: string): RetryQueueEntryRecord {
    const entry = this.requireEntry(entryId);
    entry.status = "completed";
    entry.updatedAtEpochSeconds = this.nowEpochSeconds();
    this.persist();
    return structuredClone(entry);
  }

  fail(
    entryId: string,
    error: unknown,
    retryPolicy?: {
      baseDelaySeconds?: number;
      backoffMultiplier?: number;
    },
  ): RetryQueueEntryRecord {
    const entry = this.requireEntry(entryId);
    const now = this.nowEpochSeconds();

    entry.attempts += 1;
    entry.lastError = error instanceof Error ? error.message : String(error);
    entry.updatedAtEpochSeconds = now;

    if (entry.attempts >= entry.maxAttempts) {
      entry.status = "dead_letter";
      this.persist();
      return structuredClone(entry);
    }

    const baseDelaySeconds = retryPolicy?.baseDelaySeconds ?? 30;
    const backoffMultiplier = retryPolicy?.backoffMultiplier ?? 2;
    const delaySeconds = Math.max(1, Math.round(baseDelaySeconds * backoffMultiplier ** (entry.attempts - 1)));

    entry.status = "pending";
    entry.notBeforeEpochSeconds = now + delaySeconds;
    this.persist();
    return structuredClone(entry);
  }

  list(queueName?: string): RetryQueueEntryRecord[] {
    const output = Array.from(this.entriesById.values(), (entry) => structuredClone(entry));
    const filtered = queueName
      ? output.filter((entry) => entry.queueName === queueName)
      : output;

    return filtered.sort(
      (left, right) =>
        left.notBeforeEpochSeconds - right.notBeforeEpochSeconds ||
        left.createdAtEpochSeconds - right.createdAtEpochSeconds ||
        left.entryId.localeCompare(right.entryId),
    );
  }

  private requireEntry(entryId: string): RetryQueueEntryRecord {
    const normalizedEntryId = assertNonEmpty(entryId, "entryId");
    const entry = this.entriesById.get(normalizedEntryId);
    if (!entry) {
      throw new RetryQueueError("ENTRY_NOT_FOUND", "Retry queue entry does not exist.");
    }
    return entry;
  }

  private nextEntryId(): string {
    this.entrySequence += 1;
    return `retry-${this.entrySequence}`;
  }

  private parseSequence(entryId: string): number {
    const match = entryId.match(/^retry-(\d+)$/);
    if (!match) {
      return 0;
    }
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private persist(): void {
    if (!this.stateStore) {
      return;
    }

    const entries = this.list();
    this.stateStore.update((draft) => {
      draft.retryQueueEntries = entries;
    });
  }
}
