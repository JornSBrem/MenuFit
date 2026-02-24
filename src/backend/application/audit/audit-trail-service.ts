import type { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";
import type { AuditEvent, AuditEventInput, AuditListFilter } from "./types";

const DEFAULT_REDACTED_KEYS = [
  "authorization",
  "cookie",
  "set-cookie",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "password",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const redactDetails = (
  value: unknown,
  redactedKeys: Set<string>,
): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => redactDetails(entry, redactedKeys));
  }

  if (!isRecord(value)) {
    return value;
  }

  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    output[key] = redactedKeys.has(key.toLowerCase())
      ? "***REDACTED***"
      : redactDetails(entry, redactedKeys);
  }
  return output;
};

export interface AuditTrailServiceOptions {
  now?: () => string;
  redactedKeys?: string[];
  stateStore?: PersistentStateStore;
}

export class AuditTrailService {
  private readonly events: AuditEvent[] = [];

  private sequence = 0;

  private readonly now: () => string;

  private readonly redactedKeys: Set<string>;

  private readonly stateStore?: PersistentStateStore;

  constructor(options?: AuditTrailServiceOptions) {
    this.now = options?.now ?? (() => new Date().toISOString());
    this.redactedKeys = new Set(
      (options?.redactedKeys ?? [...DEFAULT_REDACTED_KEYS]).map((key) => key.toLowerCase()),
    );
    this.stateStore = options?.stateStore;

    if (this.stateStore) {
      const persisted = this.stateStore.read().auditTrail;
      this.events.push(...persisted);
      this.sequence = this.events.reduce(
        (max, row) => Math.max(max, this.parseSequence(row.eventId)),
        0,
      );
    }
  }

  record(input: AuditEventInput): AuditEvent {
    const event: AuditEvent = {
      eventId: this.nextId(),
      createdAt: this.now(),
      ...input,
      details: input.details
        ? (redactDetails(input.details, this.redactedKeys) as Record<string, unknown>)
        : undefined,
    };
    this.events.push(event);
    this.persist();
    return event;
  }

  list(filter?: AuditListFilter): AuditEvent[] {
    return this.events.filter((event) => {
      if (filter?.category && event.category !== filter.category) {
        return false;
      }
      if (filter?.outcome && event.outcome !== filter.outcome) {
        return false;
      }
      if (filter?.actorId && event.actorId !== filter.actorId) {
        return false;
      }
      return true;
    });
  }

  private nextId(): string {
    this.sequence += 1;
    return `audit-${this.sequence}`;
  }

  private parseSequence(eventId: string): number {
    const match = eventId.match(/^audit-(\d+)$/);
    if (!match) {
      return 0;
    }
    const number = Number(match[1]);
    return Number.isFinite(number) ? number : 0;
  }

  private persist(): void {
    if (!this.stateStore) {
      return;
    }
    this.stateStore.update((draft) => {
      draft.auditTrail = structuredClone(this.events);
    });
  }
}
