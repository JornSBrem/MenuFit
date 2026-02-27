import type {
  AdminMappingOverrideRecord,
  AdminOperationReport,
  AdminRecipeRecord,
  AdminSession,
  IngestRecipeWebResult,
  ReprocessFromBronzeResult,
  AdminWeekMenuRecord,
  ApiEnvelope,
  CleanupRequest,
  ConfigUpdateRequest,
  DeleteMappingOverrideRequest,
  DeleteRecipeRequest,
  DeleteWeekMenuRequest,
  GoldWeekPlanRecord,
  HouseholdInvitationRecord,
  HouseholdInvitationsQuery,
  HouseholdInviteResendRequest,
  HouseholdOperationsStatus,
  HouseholdSessionResetRequest,
  IngestJobStatus,
  IngestRequest,
  PgDiscoverResult,
  PgLoginRequest,
  PgLoginResult,
  RecomputeRequest,
  SystemDiagnosticsSummary,
  SystemJobRecord,
  UpsertMappingOverrideRequest,
  UpsertRecipeRequest,
  UpsertWeekMenuRequest,
  UserSessionDiagnostic,
} from "./types.ts";

export class AdminApiClient {
  private readonly baseUrl: string;

  private readonly session: AdminSession;

  constructor(baseUrl: string, session: AdminSession) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.session = session;
  }

  runIngest(body: IngestRequest): Promise<ApiEnvelope<AdminOperationReport>> {
    return this.post("/api/v3/admin/ingest", body);
  }

  runRecompute(body: RecomputeRequest): Promise<ApiEnvelope<AdminOperationReport>> {
    return this.post("/api/v3/admin/recompute", body);
  }

  updateConfig(body: ConfigUpdateRequest): Promise<ApiEnvelope<AdminOperationReport>> {
    return this.post("/api/v3/admin/config", body);
  }

  runCleanup(body: CleanupRequest): Promise<ApiEnvelope<AdminOperationReport>> {
    return this.post("/api/v3/admin/cleanup", body);
  }

  pgLogin(body: PgLoginRequest): Promise<ApiEnvelope<PgLoginResult>> {
    return this.post("/api/v3/admin/pg-login", body);
  }

  pgDiscover(year?: number): Promise<ApiEnvelope<PgDiscoverResult>> {
    return this.post("/api/v3/admin/pg-discover", year ? { year } : {});
  }

  reprocessFromBronze(): Promise<ApiEnvelope<ReprocessFromBronzeResult>> {
    return this.post("/api/v3/admin/reprocess-from-bronze", {});
  }

  ingestRecipeWeb(): Promise<ApiEnvelope<IngestRecipeWebResult>> {
    return this.post("/api/v3/admin/ingest-recipe-web", {});
  }

  getIngestStatus(jobId: string): Promise<ApiEnvelope<IngestJobStatus>> {
    return this.get(`/api/v3/admin/ingest-status/${jobId}`);
  }

  getDiagnostics(): Promise<ApiEnvelope<SystemDiagnosticsSummary>> {
    return this.get("/api/v3/system/diagnostics");
  }

  getJobs(): Promise<ApiEnvelope<SystemJobRecord[]>> {
    return this.get("/api/v3/system/jobs");
  }

  listRecipes(): Promise<ApiEnvelope<AdminRecipeRecord[]>> {
    return this.get("/api/v3/admin/data/recipes");
  }

  upsertRecipe(body: UpsertRecipeRequest): Promise<ApiEnvelope<AdminOperationReport>> {
    return this.post("/api/v3/admin/data/recipes/upsert", body);
  }

  deleteRecipe(body: DeleteRecipeRequest): Promise<ApiEnvelope<AdminOperationReport>> {
    return this.post("/api/v3/admin/data/recipes/delete", body);
  }

  listWeekMenus(): Promise<ApiEnvelope<AdminWeekMenuRecord[]>> {
    return this.get("/api/v3/admin/data/week-menus");
  }

  upsertWeekMenu(body: UpsertWeekMenuRequest): Promise<ApiEnvelope<AdminOperationReport>> {
    return this.post("/api/v3/admin/data/week-menus/upsert", body);
  }

  deleteWeekMenu(body: DeleteWeekMenuRequest): Promise<ApiEnvelope<AdminOperationReport>> {
    return this.post("/api/v3/admin/data/week-menus/delete", body);
  }

  listGoldWeekPlans(): Promise<ApiEnvelope<GoldWeekPlanRecord[]>> {
    return this.get("/api/v3/admin/data/gold-week-plans");
  }

  listMappingOverrides(): Promise<ApiEnvelope<AdminMappingOverrideRecord[]>> {
    return this.get("/api/v3/admin/data/mapping-overrides");
  }

  upsertMappingOverride(
    body: UpsertMappingOverrideRequest,
  ): Promise<ApiEnvelope<AdminOperationReport>> {
    return this.post("/api/v3/admin/data/mapping-overrides/upsert", body);
  }

  deleteMappingOverride(
    body: DeleteMappingOverrideRequest,
  ): Promise<ApiEnvelope<AdminOperationReport>> {
    return this.post("/api/v3/admin/data/mapping-overrides/delete", body);
  }

  listHouseholdStatuses(): Promise<ApiEnvelope<HouseholdOperationsStatus[]>> {
    return this.get("/api/v3/admin/households/status");
  }

  listHouseholdInvitations(
    query: HouseholdInvitationsQuery,
  ): Promise<ApiEnvelope<HouseholdInvitationRecord[]>> {
    const params = new URLSearchParams({ householdId: query.householdId });
    return this.get(`/api/v3/admin/households/invitations?${params.toString()}`);
  }

  resendHouseholdInvitation(
    body: HouseholdInviteResendRequest,
  ): Promise<ApiEnvelope<AdminOperationReport>> {
    return this.post("/api/v3/admin/households/invite-resend", body);
  }

  resetHouseholdSession(
    body: HouseholdSessionResetRequest,
  ): Promise<ApiEnvelope<AdminOperationReport>> {
    return this.post("/api/v3/admin/households/session-reset", body);
  }

  diagnoseUserSession(subjectId: string): Promise<ApiEnvelope<UserSessionDiagnostic>> {
    const params = new URLSearchParams({ subjectId });
    return this.get(`/api/v3/admin/households/session-diagnose?${params.toString()}`);
  }

  private async get<T>(path: string): Promise<ApiEnvelope<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.session.accessToken}`,
      },
    });

    const payload = (await response.json()) as ApiEnvelope<T>;
    return payload;
  }

  private async post<T>(path: string, body: unknown): Promise<ApiEnvelope<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.session.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as ApiEnvelope<T>;
    return payload;
  }
}
