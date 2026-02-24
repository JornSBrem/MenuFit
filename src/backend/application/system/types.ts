export type SystemOperationType = "backup" | "restore" | "cleanup";
export type SystemOperationMode = "dry-run" | "execute";
export type SystemJobStatusValue = "planned" | "running" | "completed" | "failed";
export type SystemLogLevel = "info" | "warning" | "error";

export interface SystemHealthStatus {
  status: "ok" | "degraded";
  timestamp: string;
  components: {
    backend: "ok" | "degraded";
    jobs: "ok" | "degraded";
    storage: "ok" | "degraded";
  };
}

export interface SystemDiagnosticsSummary {
  generatedAt: string;
  totalJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  reportsGenerated: number;
  lastOperationAt?: string;
}

export interface SystemJobRecord {
  jobId: string;
  operationId: string;
  operationType: SystemOperationType;
  mode: SystemOperationMode;
  status: SystemJobStatusValue;
  startedAt: string;
  finishedAt?: string;
  actorId: string;
  message: string;
}

export interface SystemOperationLogEntry {
  at: string;
  level: SystemLogLevel;
  message: string;
}

export interface SystemOperationReport {
  reportId: string;
  jobId: string;
  operationId: string;
  operationType: SystemOperationType;
  mode: SystemOperationMode;
  status: "success" | "failed";
  createdAt: string;
  actorId: string;
  target: string;
  logs: SystemOperationLogEntry[];
}

export interface SystemOperationRequest {
  operationId: string;
  mode: SystemOperationMode;
  actorId: string;
  target: string;
}
