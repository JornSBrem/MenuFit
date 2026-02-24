import type { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";
import type { AuditTrailService } from "../audit/audit-trail-service.ts";
import type {
  SystemDiagnosticsSummary,
  SystemHealthStatus,
  SystemJobRecord,
  SystemOperationLogEntry,
  SystemOperationReport,
  SystemOperationRequest,
  SystemOperationType,
} from "./types";

export interface SystemOperationsServiceOptions {
  now?: () => string;
  auditTrail?: AuditTrailService;
  stateStore?: PersistentStateStore;
}

export class SystemOperationsError extends Error {
  readonly code: string;

  readonly hint?: string;

  constructor(code: string, message: string, hint?: string) {
    super(message);
    this.name = "SystemOperationsError";
    this.code = code;
    this.hint = hint;
  }
}

const validateRequest = (request: SystemOperationRequest): void => {
  if (!request.operationId.trim()) {
    throw new SystemOperationsError("INVALID_OPERATION_ID", "operationId is required.");
  }
  if (!["dry-run", "execute"].includes(request.mode)) {
    throw new SystemOperationsError("INVALID_MODE", "mode must be dry-run or execute.");
  }
  if (!request.actorId.trim()) {
    throw new SystemOperationsError("INVALID_ACTOR", "actorId is required.");
  }
  if (!request.target.trim()) {
    throw new SystemOperationsError("INVALID_TARGET", "target is required.");
  }
};

export class SystemOperationsService {
  private readonly jobs: SystemJobRecord[] = [];

  private readonly reports: SystemOperationReport[] = [];

  private reportSequence = 0;

  private jobSequence = 0;

  private readonly now: () => string;

  private readonly auditTrail?: AuditTrailService;

  private readonly stateStore?: PersistentStateStore;

  private lastOperationAt?: string;

  constructor(options?: SystemOperationsServiceOptions) {
    this.now = options?.now ?? (() => new Date().toISOString());
    this.auditTrail = options?.auditTrail;
    this.stateStore = options?.stateStore;

    if (this.stateStore) {
      const persisted = this.stateStore.read();
      this.jobs.push(...persisted.systemJobs);
      this.reports.push(...persisted.systemReports);
      this.lastOperationAt = this.reports[this.reports.length - 1]?.createdAt;

      this.jobSequence = this.jobs.reduce(
        (max, row) => Math.max(max, this.parseSequence(row.jobId, "system-job-")),
        0,
      );
      this.reportSequence = this.reports.reduce(
        (max, row) => Math.max(max, this.parseSequence(row.reportId, "system-report-")),
        0,
      );
    }
  }

  getHealth(): SystemHealthStatus {
    const failedJobs = this.jobs.filter((job) => job.status === "failed").length;
    const jobsHealth = failedJobs > 0 ? "degraded" : "ok";
    return {
      status: jobsHealth === "ok" ? "ok" : "degraded",
      timestamp: this.now(),
      components: {
        backend: "ok",
        storage: "ok",
        jobs: jobsHealth,
      },
    };
  }

  getDiagnostics(): SystemDiagnosticsSummary {
    return {
      generatedAt: this.now(),
      totalJobs: this.jobs.length,
      runningJobs: this.jobs.filter((job) => job.status === "running").length,
      completedJobs: this.jobs.filter((job) => job.status === "completed").length,
      failedJobs: this.jobs.filter((job) => job.status === "failed").length,
      reportsGenerated: this.reports.length,
      lastOperationAt: this.lastOperationAt,
    };
  }

  listJobs(): SystemJobRecord[] {
    return [...this.jobs];
  }

  runBackup(request: SystemOperationRequest): SystemOperationReport {
    return this.runOperation("backup", request);
  }

  runRestore(request: SystemOperationRequest): SystemOperationReport {
    return this.runOperation("restore", request);
  }

  runCleanup(request: SystemOperationRequest): SystemOperationReport {
    return this.runOperation("cleanup", request);
  }

  private runOperation(
    operationType: SystemOperationType,
    request: SystemOperationRequest,
  ): SystemOperationReport {
    try {
      validateRequest(request);

      const startedAt = this.now();
      const logs: SystemOperationLogEntry[] = [
        {
          at: startedAt,
          level: "info",
          message: `${operationType} operation started by ${request.actorId}.`,
        },
        {
          at: startedAt,
          level: "info",
          message:
            request.mode === "dry-run"
              ? `Dry-run planned for target: ${request.target}.`
              : `Execute mode started for target: ${request.target}.`,
        },
      ];

      const job: SystemJobRecord = {
        jobId: this.nextJobId(),
        operationId: request.operationId,
        operationType,
        mode: request.mode,
        status: "running",
        startedAt,
        actorId: request.actorId,
        message: `${operationType} running`,
      };

      const finishedAt = this.now();
      job.finishedAt = finishedAt;
      job.status = "completed";
      job.message =
        request.mode === "dry-run"
          ? `${operationType} dry-run completed`
          : `${operationType} execute completed`;
      this.jobs.push(job);

      logs.push({
        at: finishedAt,
        level: "info",
        message:
          request.mode === "dry-run"
            ? `${operationType} dry-run completed without data mutation.`
            : `${operationType} execute completed with operational changes.`,
      });

      const report: SystemOperationReport = {
        reportId: this.nextReportId(),
        jobId: job.jobId,
        operationId: request.operationId,
        operationType,
        mode: request.mode,
        status: "success",
        createdAt: finishedAt,
        actorId: request.actorId,
        target: request.target,
        logs,
      };
      this.reports.push(report);
      this.lastOperationAt = finishedAt;
      this.persistState();
      this.auditTrail?.record({
        category: "system",
        action: operationType,
        resourceId: request.operationId,
        actorId: request.actorId,
        outcome: request.mode === "dry-run" ? "dry_run" : "success",
        details: {
          target: request.target,
          mode: request.mode,
          jobId: job.jobId,
        },
      });
      return report;
    } catch (error) {
      if (error instanceof SystemOperationsError) {
        this.auditTrail?.record({
          category: "system",
          action: `${operationType}_rejected`,
          resourceId: request.operationId,
          actorId: request.actorId,
          outcome: "failure",
          details: {
            target: request.target,
            mode: request.mode,
            code: error.code,
            message: error.message,
          },
        });
      }
      throw error;
    }
  }

  private nextJobId(): string {
    this.jobSequence += 1;
    return `system-job-${this.jobSequence}`;
  }

  private nextReportId(): string {
    this.reportSequence += 1;
    return `system-report-${this.reportSequence}`;
  }

  private parseSequence(value: string, prefix: string): number {
    if (!value.startsWith(prefix)) {
      return 0;
    }
    const number = Number(value.slice(prefix.length));
    return Number.isFinite(number) ? number : 0;
  }

  private persistState(): void {
    if (!this.stateStore) {
      return;
    }
    const jobs = this.jobs.map((row) => structuredClone(row));
    const reports = this.reports.map((row) => structuredClone(row));
    this.stateStore.update((draft) => {
      draft.systemJobs = jobs;
      draft.systemReports = reports;
    });
  }
}
