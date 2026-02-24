export type AdminTab = "data" | "settings" | "extract" | "operations";

export interface AdminSession {
  sessionKind: "admin";
  accessToken: string;
  operatorId: string;
  role: "operator" | "owner";
}

export interface AdminOperationReport {
  reportId: string;
  operationId: string;
  operationType: "ingest" | "recompute" | "config_update" | "cleanup";
  status: "completed" | "dry_run";
  dryRun: boolean;
  message: string;
  createdAt: string;
  performedBy: string;
  details?: Record<string, unknown>;
}

export interface IngestRequest {
  operationId: string;
  weeks: number[];
  kcals: number[];
  basePersons: number[];
}

export interface RecomputeRequest {
  operationId: string;
  transformVersion: string;
  week: number;
  kcal: number;
  basePersons: number;
}

export interface ConfigUpdateRequest {
  operationId: string;
  key: string;
  value: unknown;
}

export interface CleanupRequest {
  operationId: string;
  dryRun: boolean;
  targets: string[];
}

export interface AdminApiError {
  code: string;
  message: string;
  hint?: string;
}

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: AdminApiError;
}
