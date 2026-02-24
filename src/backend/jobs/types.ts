export type SchedulerRunStatus = "running" | "completed" | "failed";

export interface SchedulerRunRecord {
  runId: string;
  jobName: string;
  status: SchedulerRunStatus;
  startedAtEpochSeconds: number;
  finishedAtEpochSeconds?: number;
  message?: string;
}

export type RetryQueueEntryStatus = "pending" | "processing" | "completed" | "dead_letter";

export interface RetryQueueEntryRecord {
  entryId: string;
  queueName: string;
  status: RetryQueueEntryStatus;
  attempts: number;
  maxAttempts: number;
  notBeforeEpochSeconds: number;
  payload: Record<string, unknown>;
  lastError?: string;
  createdAtEpochSeconds: number;
  updatedAtEpochSeconds: number;
}
