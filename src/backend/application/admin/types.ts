export type AdminOperationType =
  | "ingest"
  | "recompute"
  | "config_update"
  | "cleanup"
  | "cutover_checklist";
export type AdminOperationStatus = "completed" | "dry_run";

export interface AdminOperationReport {
  reportId: string;
  operationId: string;
  operationType: AdminOperationType;
  status: AdminOperationStatus;
  dryRun: boolean;
  message: string;
  createdAt: string;
  performedBy: string;
  details?: Record<string, unknown>;
}

export interface AdminConfigEntry {
  key: string;
  value: unknown;
  updatedAt: string;
  updatedBy: string;
}
