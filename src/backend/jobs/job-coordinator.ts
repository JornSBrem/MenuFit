import { PersistentRetryQueue } from "./persistent-retry-queue.ts";
import { ProductionScheduler } from "./production-scheduler.ts";
import type { RetryQueueEntryRecord, SchedulerRunRecord } from "./types.ts";

interface ProductionJobCoordinatorOptions {
  scheduler: ProductionScheduler;
  retryQueue: PersistentRetryQueue;
}

const assertNonEmpty = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} is required.`);
  }
  return normalized;
};

export class ProductionJobCoordinator {
  private readonly scheduler: ProductionScheduler;

  private readonly retryQueue: PersistentRetryQueue;

  constructor(options: ProductionJobCoordinatorOptions) {
    this.scheduler = options.scheduler;
    this.retryQueue = options.retryQueue;
  }

  async runIngestJob(
    operationId: string,
    run: () => Promise<void> | void,
  ): Promise<SchedulerRunRecord> {
    const normalizedOperationId = assertNonEmpty(operationId, "operationId");
    return this.runWithRetryQueue({
      jobName: `ingest:${normalizedOperationId}`,
      queueName: "ingest-external",
      queuePayload: {
        operationId: normalizedOperationId,
      },
      run,
    });
  }

  async runSystemJob(
    operationId: string,
    run: () => Promise<void> | void,
    target: string,
  ): Promise<SchedulerRunRecord> {
    const normalizedOperationId = assertNonEmpty(operationId, "operationId");
    const normalizedTarget = assertNonEmpty(target, "target");
    return this.runWithRetryQueue({
      jobName: `system:${normalizedOperationId}`,
      queueName: "system-external",
      queuePayload: {
        operationId: normalizedOperationId,
        target: normalizedTarget,
      },
      run,
    });
  }

  async processRetryQueue(
    queueName: string,
    handler: (entry: RetryQueueEntryRecord) => Promise<void> | void,
  ): Promise<RetryQueueEntryRecord | null> {
    const due = this.retryQueue.claimDue(queueName);
    if (!due) {
      return null;
    }

    try {
      await handler(due);
      return this.retryQueue.complete(due.entryId);
    } catch (error) {
      return this.retryQueue.fail(due.entryId, error, {
        baseDelaySeconds: 30,
        backoffMultiplier: 2,
      });
    }
  }

  private async runWithRetryQueue(input: {
    jobName: string;
    queueName: string;
    queuePayload: Record<string, unknown>;
    run: () => Promise<void> | void;
  }): Promise<SchedulerRunRecord> {
    this.scheduler.registerJob(input.jobName, async () => {
      await input.run();
    });
    const result = await this.scheduler.runJob(input.jobName);

    if (result.status === "failed") {
      this.retryQueue.enqueue({
        queueName: input.queueName,
        payload: {
          ...input.queuePayload,
          reason: result.message ?? "unknown",
        },
        maxAttempts: 5,
      });
    }

    return result;
  }
}
