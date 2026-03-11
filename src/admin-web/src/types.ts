export type AdminTab = "data" | "settings" | "extract" | "operations" | "eetmeter";
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
  /** Aanwezig bij async ingest-jobs: ID om status te pollen */
  jobId?: string;
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

export interface GoldWeekPlanRecord {
  weekPlanId: string;
  year: number;
  week: number;
  kcal: number;
  basePersons: number;
  mealCount: number;
  generatedAt: string;
}

export interface AdminDataViewData {
  diagnostics: SystemDiagnosticsSummary;
  recipes: AdminRecipeRecord[];
  weekMenus: AdminWeekMenuRecord[];
  mappingOverrides: AdminMappingOverrideRecord[];
  goldWeekPlans: GoldWeekPlanRecord[];
}

export interface AdminSettingsViewData {
  entries: AdminSettingsEntry[];
  auditTrail: AdminConfigAuditEntry[];
}

export interface PgLoginRequest {
  email: string;
  password: string;
}

export interface PgLoginResult {
  message: string;
  cookieNames: string[];
  statusCode: number;
}

export interface PgLoginStatus {
  cookieNames: string[];
  loggedInAt: string;
}

export interface PgDiscoverResult {
  availableWeeks: number[];
  probedWeeks: number[];
  errors: Array<{ week: number; error: string }>;
  defaultKcals: number[];
  defaultBasePersons: number[];
}

export interface ReprocessFromBronzeResult {
  filesScanned: number;
  processed: number;
  totalMeals: number;
  errors: string[];
}

export interface IngestRecipeWebResult {
  totalRecipes: number;
  fetched: number;
  withData: number;
  errors: string[];
}

export interface IngestJobStatus {
  jobId: string;
  status: "running" | "completed" | "failed";
  phase: "fetching" | "processing" | "done";
  fetched: number;
  totalFetches: number;
  processed: number;
  totalProcessing: number;
  errors: string[];
  startedAt: string;
  finishedAt?: string;
  tasksRan?: number;
  goldProjected?: number;
}

export interface AdminExtractViewData {
  jobs: SystemJobRecord[];
  pgLoginStatus?: PgLoginStatus;
  pgDiscoverResult?: PgDiscoverResult;
  activeIngestJob?: IngestJobStatus;
  reprocessResult?: ReprocessFromBronzeResult;
  ingestRecipeWebResult?: IngestRecipeWebResult;
}

export interface AdminOperationsViewData {
  history: AdminOperationReport[];
  lastReport?: AdminOperationReport;
  householdStatuses: HouseholdOperationsStatus[];
  invitations: HouseholdInvitationRecord[];
  sessionStatuses: UserSessionDiagnostic[];
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
  eetmeter: AdminAsyncViewState<EetmeterViewData>;
}

// ---- Eetmeter types --------------------------------------------------------

export interface EetmeterConsumptieRecord {
  id: string;
  productNaam: string;
  merkNaam: string;
  hoeveelheid: number;
  eenheid: string;
  periode: number;
  energie: number;
  eiwit: number;
  vet: number;
  koolhydraten: number;
  vezels: number;
}

export interface EetmeterMaaltijdRecord {
  naam: string;
  periode: number;
  energie: number;
  eiwit: number;
  vet: number;
  koolhydraten: number;
  items: EetmeterConsumptieRecord[];
}

export interface EetmeterDagRecord {
  datum: string;
  maaltijden: EetmeterMaaltijdRecord[];
  totaalEnergie: number;
  totaalEiwit: number;
  totaalVet: number;
  totaalKoolhydraten: number;
}

export interface EetmeterViewData {
  isIngelogd: boolean;
  datum: string;
  dag?: EetmeterDagRecord;
}

export interface EetmeterCredentialsRequest {
  email: string;
  password: string;
}

export interface AdminDashboardUiState {
  selectedTab: AdminTab;
  views: AdminDashboardViewsState;
}

export interface IngestRequest {
  operationId: string;
  weeks: number[];
  basePersons: number[];
}

export interface AdminRecipeRecord {
  recipeId: string;
  slug: string;
  title: string;
  visibility: "private" | "household" | "shared";
  prepMinutes?: number;
  tags: string[];
  updatedAt: string;
  updatedBy: string;
}

export interface AdminWeekMenuRecord {
  weekMenuId: string;
  householdId: string;
  week: number;
  kcal: number;
  basePersons: number;
  mealCount: number;
  updatedAt: string;
  updatedBy: string;
}

export interface AdminMappingOverrideRecord {
  overrideId: string;
  sourceKey: string;
  targetKey: string;
  note?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface UpsertRecipeRequest {
  operationId: string;
  recipe: {
    recipeId: string;
    slug: string;
    title: string;
    visibility: "private" | "household" | "shared";
    prepMinutes?: number;
    tags: string[];
  };
}

export interface DeleteRecipeRequest {
  operationId: string;
  recipeId: string;
}

export interface UpsertWeekMenuRequest {
  operationId: string;
  weekMenu: {
    weekMenuId: string;
    householdId: string;
    week: number;
    kcal: number;
    basePersons: number;
    mealCount: number;
  };
}

export interface DeleteWeekMenuRequest {
  operationId: string;
  weekMenuId: string;
}

export interface UpsertMappingOverrideRequest {
  operationId: string;
  override: {
    overrideId: string;
    sourceKey: string;
    targetKey: string;
    note?: string;
  };
}

export interface DeleteMappingOverrideRequest {
  operationId: string;
  overrideId: string;
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

export interface AdminConfigAuditEntry {
  operationId: string;
  key: string;
  value: unknown;
  updatedAt: string;
  updatedBy: string;
}

export interface CleanupRequest {
  operationId: string;
  dryRun: boolean;
  targets: string[];
}

export interface HouseholdOperationsStatus {
  householdId: string;
  memberCount: number;
  pendingInvitationCount: number;
  updatedAt: string;
}

export interface HouseholdInvitationRecord {
  invitationId: string;
  householdId: string;
  invitedUserId: string;
  invitedByUserId: string;
  status: "pending" | "accepted" | "revoked";
  createdAt: string;
  respondedAt?: string;
}

export interface UserSessionDiagnostic {
  subjectId: string;
  householdId: string;
  hasActiveSession: boolean;
  expiresAtEpochSeconds?: number;
  lastValidatedAt: string;
}

export interface HouseholdInvitationsQuery {
  householdId: string;
}

export interface HouseholdInviteResendRequest {
  householdId: string;
  invitedUserId: string;
}

export interface HouseholdSessionResetRequest {
  householdId: string;
  subjectId: string;
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
