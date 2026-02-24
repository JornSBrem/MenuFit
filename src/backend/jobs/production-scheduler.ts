import type { PersistentStateStore } from "../integrations/storage/persistent-state-store.ts";
import type { SchedulerRunRecord } from "./types.ts";

interface ProductionSchedulerOptions {
  nowEpochSeconds?: () => number;
  stateStore?: PersistentStateStore;
}

interface RegisteredJob {
  jobName: string;
  run: () => Promise<void>;
}

export class ProductionSchedulerError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ProductionSchedulerError";
    this.code = code;
  }
}

const assertNonEmpty = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new ProductionSchedulerError("INVALID_INPUT", `${field} is required.`);
  }
  return normalized;
};

export class ProductionScheduler {
  private readonly jobsByName = new Map<string, RegisteredJob>();

  private readonly runs: SchedulerRunRecord[] = [];

  private readonly nowEpochSeconds: () => number;

  private readonly stateStore?: PersistentStateStore;

  private runSequence = 0;

  constructor(options?: ProductionSchedulerOptions) {
    this.nowEpochSeconds = options?.nowEpochSeconds ?? (() => Math.floor(Date.now() / 1000));
    this.stateStore = options?.stateStore;

    if (this.stateStore) {
      const persisted = this.stateStore.read().schedulerRuns;
      this.runs.push(...persisted.map((run) => structuredClone(run)));
      this.runSequence = this.runs.reduce((max, run) => Math.max(max, this.parseSequence(run.runId)), 0);
    }
  }

  registerJob(jobName: string, run: () => Promise<void> | void): void {
    const normalizedName = assertNonEmpty(jobName, "jobName");
    this.jobsByName.set(normalizedName, {
      jobName: normalizedName,
      run: async () => {
        await run();
      },
    });
  }

  async runJob(jobName: string): Promise<SchedulerRunRecord> {
    const normalizedName = assertNonEmpty(jobName, "jobName");
    const job = this.jobsByName.get(normalizedName);
    if (!job) {
      throw new ProductionSchedulerError("JOB_NOT_FOUND", "Scheduled job is not registered.");
    }

    const startedAtEpochSeconds = this.nowEpochSeconds();
    const runRecord: SchedulerRunRecord = {
      runId: this.nextRunId(),
      jobName: normalizedName,
      status: "running",
      startedAtEpochSeconds,
    };
    this.runs.push(runRecord);
    this.persist();

    try {
      await job.run();
      runRecord.status = "completed";
      runRecord.finishedAtEpochSeconds = this.nowEpochSeconds();
      this.persist();
      return structuredClone(runRecord);
    } catch (error) {
      runRecord.status = "failed";
      runRecord.finishedAtEpochSeconds = this.nowEpochSeconds();
      runRecord.message = error instanceof Error ? error.message : String(error);
      this.persist();
      return structuredClone(runRecord);
    }
  }

  listRuns(): SchedulerRunRecord[] {
    return [...this.runs]
      .map((run) => structuredClone(run))
      .sort(
        (left, right) =>
          left.startedAtEpochSeconds - right.startedAtEpochSeconds || left.runId.localeCompare(right.runId),
      );
  }

  private nextRunId(): string {
    this.runSequence += 1;
    return `sched-${this.runSequence}`;
  }

  private parseSequence(runId: string): number {
    const match = runId.match(/^sched-(\d+)$/);
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

    this.stateStore.update((draft) => {
      draft.schedulerRuns = this.listRuns();
    });
  }
}
