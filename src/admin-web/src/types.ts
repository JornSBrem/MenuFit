export type AdminTab = "data" | "settings" | "extract" | "operations";
export type AdminViewStatus = "loading" | "empty" | "error" | "success";

export interface AdminSession {
  sessionKind: "admin";
  accessToken: string;
  operatorId: string;
  role: "operator" | "owner";
}

export interface AdminOperationReport {
  reportId: string;
  operationId: string;
  operationType:
    | "ingest"
    | "recompute"
    | "config_update"
    | "cleanup"
    | "cutover_checklist";
  status: "completed" | "dry_run";
  dryRun: boolean;
  message: string;
  createdAt: string;
  performedBy: string;
  details?: Record<string, unknown>;
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
  operationType: "backup" | "restore" | "cleanup";
  mode: "dry-run" | "execute";
  status: "planned" | "running" | "completed" | "failed";
  startedAt: string;
  finishedAt?: string;
  actorId: string;
  message: string;
}

export interface AdminSettingsEntry {
  key: string;
  value: unknown;
  updatedAt: string;
  updatedBy: string;
}

export interface AdminDataViewData {
  diagnostics: SystemDiagnosticsSummary;
}

export interface AdminSettingsViewData {
  entries: AdminSettingsEntry[];
}

export interface AdminExtractViewData {
  jobs: SystemJobRecord[];
}

export interface AdminOperationsViewData {
  history: AdminOperationReport[];
  lastReport?: AdminOperationReport;
}

export interface AdminAsyncViewState<T> {
  status: AdminViewStatus;
  data?: T;
  error?: AdminApiError;
}

export interface AdminDashboardViewsState {
  data: AdminAsyncViewState<AdminDataViewData>;
  settings: AdminAsyncViewState<AdminSettingsViewData>;
  extract: AdminAsyncViewState<AdminExtractViewData>;
  operations: AdminAsyncViewState<AdminOperationsViewData>;
}

export interface AdminDashboardUiState {
  selectedTab: AdminTab;
  views: AdminDashboardViewsState;
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
