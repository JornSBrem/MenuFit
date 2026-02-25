import type { LockTelemetryEventType, LockTelemetrySink } from "./distributed-lock.ts";

const buildKey = (backend: string, eventType: LockTelemetryEventType): string =>
  `${backend}::${eventType}`;

export class LockTelemetryCollector implements LockTelemetrySink {
  private readonly counts = new Map<string, number>();

  record(input: { backend: string; eventType: LockTelemetryEventType }): void {
    const backend = input.backend.trim();
    if (!backend) {
      return;
    }
    const key = buildKey(backend, input.eventType);
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
  }

  toPrometheusMetrics(): string {
    const lines: string[] = [];
    for (const [key, count] of Array.from(this.counts.entries()).sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      const [backend, eventType] = key.split("::");
      lines.push(`menufit_lock_events_total{backend="${backend}",event="${eventType}"} ${count}`);
    }
    return lines.join("\n");
  }

  reset(): void {
    this.counts.clear();
  }
}

export const GLOBAL_LOCK_TELEMETRY = new LockTelemetryCollector();
