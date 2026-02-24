import type { AuditTrailService } from "../audit/audit-trail-service.ts";
import type { AdminConfigEntry, AdminOperationReport, AdminOperationType } from "./types";

export interface AdminOperationsServiceOptions {
  now?: () => string;
  auditTrail?: AuditTrailService;
}

interface ExecuteOptions {
  operationId: string;
  operationType: AdminOperationType;
  performedBy: string;
  dryRun?: boolean;
  details?: Record<string, unknown>;
}

export class AdminOperationsService {
  private readonly reports: AdminOperationReport[] = [];

  private readonly configStore = new Map<string, AdminConfigEntry>();

  private sequence = 0;

  private readonly now: () => string;

  private readonly auditTrail?: AuditTrailService;

  constructor(options?: AdminOperationsServiceOptions) {
    this.now = options?.now ?? (() => new Date().toISOString());
    this.auditTrail = options?.auditTrail;
  }

  runIngest(input: {
    operationId: string;
    performedBy: string;
    weeks: number[];
    kcals: number[];
    basePersons: number[];
  }): AdminOperationReport {
    return this.execute({
      operationId: input.operationId,
      operationType: "ingest",
      performedBy: input.performedBy,
      details: {
        weeks: input.weeks,
        kcals: input.kcals,
        basePersons: input.basePersons,
      },
    });
  }

  runRecompute(input: {
    operationId: string;
    performedBy: string;
    transformVersion: string;
    week: number;
    kcal: number;
    basePersons: number;
  }): AdminOperationReport {
    return this.execute({
      operationId: input.operationId,
      operationType: "recompute",
      performedBy: input.performedBy,
      details: {
        transformVersion: input.transformVersion,
        week: input.week,
        kcal: input.kcal,
        basePersons: input.basePersons,
      },
    });
  }

  updateConfig(input: {
    operationId: string;
    performedBy: string;
    key: string;
    value: unknown;
  }): AdminOperationReport {
    const updatedAt = this.now();
    this.configStore.set(input.key, {
      key: input.key,
      value: input.value,
      updatedAt,
      updatedBy: input.performedBy,
    });

    return this.execute({
      operationId: input.operationId,
      operationType: "config_update",
      performedBy: input.performedBy,
      details: {
        key: input.key,
      },
    });
  }

  runCleanup(input: {
    operationId: string;
    performedBy: string;
    dryRun: boolean;
    targets: string[];
  }): AdminOperationReport {
    return this.execute({
      operationId: input.operationId,
      operationType: "cleanup",
      performedBy: input.performedBy,
      dryRun: input.dryRun,
      details: {
        targets: input.targets,
      },
    });
  }

  listReports(): AdminOperationReport[] {
    return [...this.reports];
  }

  listConfig(): AdminConfigEntry[] {
    return Array.from(this.configStore.values()).sort((a, b) => a.key.localeCompare(b.key));
  }

  private execute(options: ExecuteOptions): AdminOperationReport {
    const createdAt = this.now();
    const dryRun = options.dryRun ?? false;
    const report: AdminOperationReport = {
      reportId: this.nextReportId(),
      operationId: options.operationId,
      operationType: options.operationType,
      status: dryRun ? "dry_run" : "completed",
      dryRun,
      message: dryRun
        ? `${options.operationType} dry-run completed.`
        : `${options.operationType} completed.`,
      createdAt,
      performedBy: options.performedBy,
      details: options.details,
    };
    this.reports.push(report);
    this.auditTrail?.record({
      category: options.operationType === "config_update" ? "config" : "admin",
      action: options.operationType,
      resourceId: options.operationId,
      actorId: options.performedBy,
      outcome: dryRun ? "dry_run" : "success",
      details: options.details,
    });
    return report;
  }

  private nextReportId(): string {
    this.sequence += 1;
    return `admin-op-${this.sequence}`;
  }
}
