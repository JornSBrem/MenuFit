import type {
  AdminMappingOverrideRecord,
  AdminConfigAuditEntry,
  AdminApiError,
  AdminAsyncViewState,
  AdminDashboardUiState,
  AdminOperationReport,
  AdminRecipeRecord,
  AdminSettingsEntry,
  AdminTab,
  AdminWeekMenuRecord,
  ApiEnvelope,
  CleanupRequest,
  ConfigUpdateRequest,
  DeleteMappingOverrideRequest,
  EetmeterCredentialsRequest,
  EetmeterViewData,
  DiscoverAndImportRecipesResult,
  IngestRecipeWebResult,
  ReprocessFromBronzeResult,
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

export interface AdminDashboardApi {
  runIngest(body: IngestRequest): Promise<ApiEnvelope<AdminOperationReport>>;
  runRecompute(body: RecomputeRequest): Promise<ApiEnvelope<AdminOperationReport>>;
  updateConfig(body: ConfigUpdateRequest): Promise<ApiEnvelope<AdminOperationReport>>;
  runCleanup(body: CleanupRequest): Promise<ApiEnvelope<AdminOperationReport>>;
  getDiagnostics(): Promise<ApiEnvelope<SystemDiagnosticsSummary>>;
  getJobs(): Promise<ApiEnvelope<SystemJobRecord[]>>;
  listRecipes(): Promise<ApiEnvelope<AdminRecipeRecord[]>>;
  upsertRecipe(body: UpsertRecipeRequest): Promise<ApiEnvelope<AdminOperationReport>>;
  deleteRecipe(body: DeleteRecipeRequest): Promise<ApiEnvelope<AdminOperationReport>>;
  listWeekMenus(): Promise<ApiEnvelope<AdminWeekMenuRecord[]>>;
  upsertWeekMenu(body: UpsertWeekMenuRequest): Promise<ApiEnvelope<AdminOperationReport>>;
  deleteWeekMenu(body: DeleteWeekMenuRequest): Promise<ApiEnvelope<AdminOperationReport>>;
  listGoldWeekPlans(): Promise<ApiEnvelope<GoldWeekPlanRecord[]>>;
  listMappingOverrides(): Promise<ApiEnvelope<AdminMappingOverrideRecord[]>>;
  upsertMappingOverride(
    body: UpsertMappingOverrideRequest,
  ): Promise<ApiEnvelope<AdminOperationReport>>;
  deleteMappingOverride(
    body: DeleteMappingOverrideRequest,
  ): Promise<ApiEnvelope<AdminOperationReport>>;
  listHouseholdStatuses(): Promise<ApiEnvelope<HouseholdOperationsStatus[]>>;
  listHouseholdInvitations(
    query: HouseholdInvitationsQuery,
  ): Promise<ApiEnvelope<HouseholdInvitationRecord[]>>;
  resendHouseholdInvitation(
    body: HouseholdInviteResendRequest,
  ): Promise<ApiEnvelope<AdminOperationReport>>;
  resetHouseholdSession(
    body: HouseholdSessionResetRequest,
  ): Promise<ApiEnvelope<AdminOperationReport>>;
  diagnoseUserSession(subjectId: string): Promise<ApiEnvelope<UserSessionDiagnostic>>;
  pgLogin(body: PgLoginRequest): Promise<ApiEnvelope<PgLoginResult>>;
  pgDiscover(year?: number): Promise<ApiEnvelope<PgDiscoverResult>>;
  getIngestStatus(jobId: string): Promise<ApiEnvelope<IngestJobStatus>>;
  reprocessFromBronze(): Promise<ApiEnvelope<ReprocessFromBronzeResult>>;
  ingestRecipeWeb(): Promise<ApiEnvelope<IngestRecipeWebResult>>;
  discoverAndImportRecipes(): Promise<ApiEnvelope<DiscoverAndImportRecipesResult>>;
  getEetmeterDag(datum?: string): Promise<ApiEnvelope<EetmeterViewData>>;
  eetmeterLogin(body: EetmeterCredentialsRequest): Promise<ApiEnvelope<{ isIngelogd: boolean }>>;
}

const createEmptyView = <T>(data?: T): AdminAsyncViewState<T> => ({
  status: "empty",
  data,
});

const createLoadingView = <T>(data?: T): AdminAsyncViewState<T> => ({
  status: "loading",
  data,
});

const createSuccessView = <T>(data: T): AdminAsyncViewState<T> => ({
  status: "success",
  data,
});

const createErrorView = <T>(error: AdminApiError, data?: T): AdminAsyncViewState<T> => ({
  status: "error",
  error,
  data,
});

const toAdminApiError = (error: unknown): AdminApiError => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    const withHint = error as { code: string; message: string; hint?: unknown };
    return {
      code: withHint.code,
      message: withHint.message,
      hint: typeof withHint.hint === "string" ? withHint.hint : undefined,
    };
  }

  if (error instanceof Error) {
    return {
      code: "UNEXPECTED_ERROR",
      message: error.message,
    };
  }

  return {
    code: "UNEXPECTED_ERROR",
    message: "Unexpected admin dashboard failure.",
  };
};

export class AdminDashboardController {
  private state: AdminDashboardUiState = {
    selectedTab: "data",
    views: {
      data: createEmptyView(),
      settings: createEmptyView({
        entries: [],
        auditTrail: [],
      }),
      extract: createEmptyView({
        jobs: [],
      }),
      operations: createEmptyView({
        history: [],
        householdStatuses: [],
        invitations: [],
        sessionStatuses: [],
      }),
      eetmeter: createEmptyView<EetmeterViewData>({
        isIngelogd: false,
        datum: new Date().toISOString().split("T")[0],
      }),
    },
  };

  private readonly operationHistory: AdminOperationReport[] = [];

  private readonly settingsByKey = new Map<string, AdminSettingsEntry>();
  private readonly settingsAuditTrail: AdminConfigAuditEntry[] = [];
  private recipesById = new Map<string, AdminRecipeRecord>();
  private weekMenusById = new Map<string, AdminWeekMenuRecord>();
  private mappingOverridesById = new Map<string, AdminMappingOverrideRecord>();

  private readonly api: AdminDashboardApi;

  constructor(api: AdminDashboardApi) {
    this.api = api;
  }

  getState(): AdminDashboardUiState {
    return structuredClone(this.state);
  }

  selectTab(tab: AdminTab): AdminDashboardUiState {
    this.state = {
      ...this.state,
      selectedTab: tab,
    };
    return this.getState();
  }

  async loadDataView(): Promise<AdminDashboardUiState> {
    this.state.views.data = createLoadingView(this.state.views.data.data);
    try {
      const diagnostics = this.unwrapEnvelope(await this.api.getDiagnostics());
      const recipes = this.listRecipesEntries();
      const weekMenus = this.listWeekMenuEntries();
      const mappingOverrides = this.listMappingOverrideEntries();
      const data = { diagnostics };
      const hasData =
        diagnostics.totalJobs > 0 ||
        diagnostics.reportsGenerated > 0 ||
        recipes.length > 0 ||
        weekMenus.length > 0 ||
        mappingOverrides.length > 0;
      const dataWithEntities = {
        ...data,
        recipes,
        weekMenus,
        mappingOverrides,
        goldWeekPlans: [],
      };
      this.state.views.data = hasData
        ? createSuccessView(dataWithEntities)
        : createEmptyView(dataWithEntities);
    } catch (error) {
      this.state.views.data = createErrorView(toAdminApiError(error), this.state.views.data.data);
    }
    return this.getState();
  }

  async loadSettingsView(): Promise<AdminDashboardUiState> {
    this.state.views.settings = createLoadingView(this.state.views.settings.data);

    const entries = this.listSettingsEntries();
    this.state.views.settings =
      entries.length === 0
        ? createEmptyView({
            entries: [],
            auditTrail: this.listSettingsAuditTrail(),
          })
        : createSuccessView({
            entries,
            auditTrail: this.listSettingsAuditTrail(),
          });
    return this.getState();
  }

  async loadExtractView(): Promise<AdminDashboardUiState> {
    // Bewaar pgLoginStatus en pgDiscoverResult bij tab-wissel
    const previous = this.state.views.extract.data;
    this.state.views.extract = createLoadingView(previous);
    try {
      const jobs = this.unwrapEnvelope(await this.api.getJobs());
      this.state.views.extract =
        jobs.length === 0
          ? createEmptyView({
              jobs: [],
              pgLoginStatus: previous?.pgLoginStatus,
              pgDiscoverResult: previous?.pgDiscoverResult,
            })
          : createSuccessView({
              jobs,
              pgLoginStatus: previous?.pgLoginStatus,
              pgDiscoverResult: previous?.pgDiscoverResult,
            });
    } catch (error) {
      this.state.views.extract = createErrorView(toAdminApiError(error), previous);
    }
    return this.getState();
  }

  async loadOperationsView(): Promise<AdminDashboardUiState> {
    const history = this.listOperationHistory();
    this.state.views.operations =
      history.length === 0
        ? createEmptyView({
            history: [],
            householdStatuses: [],
            invitations: [],
            sessionStatuses: [],
          })
        : createSuccessView({
            history,
            lastReport: history[history.length - 1],
            householdStatuses: this.state.views.operations.data?.householdStatuses ?? [],
            invitations: this.state.views.operations.data?.invitations ?? [],
            sessionStatuses: this.state.views.operations.data?.sessionStatuses ?? [],
          });
    return this.getState();
  }

  async runIngest(body: IngestRequest): Promise<AdminDashboardUiState> {
    const previous = this.state.views.extract.data;
    try {
      const report = this.unwrapEnvelope(await this.api.runIngest(body));
      // Sla het jobId op in de extract-view zodat de UI kan pollen
      const activeIngestJob: IngestJobStatus | undefined = report.jobId
        ? {
            jobId: report.jobId,
            status: "running",
            phase: "fetching",
            fetched: 0,
            totalFetches: 0,
            processed: 0,
            totalProcessing: 0,
            errors: [],
            startedAt: new Date().toISOString(),
          }
        : undefined;
      this.state.views.extract = createSuccessView({
        jobs: previous?.jobs ?? [],
        pgLoginStatus: previous?.pgLoginStatus,
        pgDiscoverResult: previous?.pgDiscoverResult,
        activeIngestJob,
      });
      // Registreer ook in de operations history
      this.operationHistory.push(report);
    } catch (error) {
      this.state.views.extract = createErrorView(toAdminApiError(error), previous);
    }
    return this.getState();
  }

  async getIngestStatus(jobId: string): Promise<AdminDashboardUiState> {
    try {
      const status = this.unwrapEnvelope(await this.api.getIngestStatus(jobId));
      const previous = this.state.views.extract.data;
      this.state.views.extract = createSuccessView({
        jobs: previous?.jobs ?? [],
        pgLoginStatus: previous?.pgLoginStatus,
        pgDiscoverResult: previous?.pgDiscoverResult,
        activeIngestJob: status,
      });
    } catch {
      // Negeer poll-fouten — de UI blijft proberen
    }
    return this.getState();
  }

  async runRecompute(body: RecomputeRequest): Promise<AdminDashboardUiState> {
    await this.executeOperation(() => this.api.runRecompute(body));
    return this.getState();
  }

  async updateConfig(body: ConfigUpdateRequest): Promise<AdminDashboardUiState> {
    const validationError = this.validateConfigUpdate(body);
    if (validationError) {
      this.state.views.operations = createErrorView(validationError, this.state.views.operations.data);
      return this.getState();
    }

    const report = await this.executeOperation(() => this.api.updateConfig(body));
    if (report) {
      this.settingsByKey.set(body.key, {
        key: body.key,
        value: body.value,
        updatedAt: report.createdAt,
        updatedBy: report.performedBy,
      });
      this.settingsAuditTrail.push({
        operationId: body.operationId,
        key: body.key,
        value: body.value,
        updatedAt: report.createdAt,
        updatedBy: report.performedBy,
      });
      if (this.settingsAuditTrail.length > 200) {
        this.settingsAuditTrail.shift();
      }
      await this.loadSettingsView();
    }
    return this.getState();
  }

  async runCleanup(body: CleanupRequest): Promise<AdminDashboardUiState> {
    await this.executeOperation(() => this.api.runCleanup(body));
    return this.getState();
  }

  async runDiagnostics(): Promise<AdminDashboardUiState> {
    return this.loadDataView();
  }

  async loadDataManagement(): Promise<AdminDashboardUiState> {
    const previous = this.state.views.data.data;
    this.state.views.data = createLoadingView(previous);
    try {
      const diagnostics = previous?.diagnostics ?? this.unwrapEnvelope(await this.api.getDiagnostics());
      const recipes = this.unwrapEnvelope(await this.api.listRecipes());
      const weekMenus = this.unwrapEnvelope(await this.api.listWeekMenus());
      const mappingOverrides = this.unwrapEnvelope(await this.api.listMappingOverrides());
      const goldWeekPlans = this.unwrapEnvelope(await this.api.listGoldWeekPlans());

      this.recipesById = new Map(recipes.map((entry) => [entry.recipeId, entry]));
      this.weekMenusById = new Map(weekMenus.map((entry) => [entry.weekMenuId, entry]));
      this.mappingOverridesById = new Map(mappingOverrides.map((entry) => [entry.overrideId, entry]));

      const data = {
        diagnostics,
        recipes: this.listRecipesEntries(),
        weekMenus: this.listWeekMenuEntries(),
        mappingOverrides: this.listMappingOverrideEntries(),
        goldWeekPlans,
      };
      const hasData =
        data.diagnostics.totalJobs > 0 ||
        data.diagnostics.reportsGenerated > 0 ||
        data.recipes.length > 0 ||
        data.weekMenus.length > 0 ||
        data.mappingOverrides.length > 0 ||
        data.goldWeekPlans.length > 0;
      this.state.views.data = hasData ? createSuccessView(data) : createEmptyView(data);
    } catch (error) {
      this.state.views.data = createErrorView(toAdminApiError(error), previous);
    }

    return this.getState();
  }

  async upsertRecipe(body: UpsertRecipeRequest): Promise<AdminDashboardUiState> {
    const report = await this.executeOperation(() => this.api.upsertRecipe(body));
    if (report) {
      this.recipesById.set(body.recipe.recipeId, {
        ...body.recipe,
        updatedAt: report.createdAt,
        updatedBy: report.performedBy,
      });
      await this.refreshDataViewEntities();
    }
    return this.getState();
  }

  async deleteRecipe(body: DeleteRecipeRequest): Promise<AdminDashboardUiState> {
    const report = await this.executeOperation(() => this.api.deleteRecipe(body));
    if (report) {
      this.recipesById.delete(body.recipeId);
      await this.refreshDataViewEntities();
    }
    return this.getState();
  }

  async upsertWeekMenu(body: UpsertWeekMenuRequest): Promise<AdminDashboardUiState> {
    const report = await this.executeOperation(() => this.api.upsertWeekMenu(body));
    if (report) {
      this.weekMenusById.set(body.weekMenu.weekMenuId, {
        ...body.weekMenu,
        updatedAt: report.createdAt,
        updatedBy: report.performedBy,
      });
      await this.refreshDataViewEntities();
    }
    return this.getState();
  }

  async deleteWeekMenu(body: DeleteWeekMenuRequest): Promise<AdminDashboardUiState> {
    const report = await this.executeOperation(() => this.api.deleteWeekMenu(body));
    if (report) {
      this.weekMenusById.delete(body.weekMenuId);
      await this.refreshDataViewEntities();
    }
    return this.getState();
  }

  async upsertMappingOverride(body: UpsertMappingOverrideRequest): Promise<AdminDashboardUiState> {
    const report = await this.executeOperation(() => this.api.upsertMappingOverride(body));
    if (report) {
      this.mappingOverridesById.set(body.override.overrideId, {
        ...body.override,
        updatedAt: report.createdAt,
        updatedBy: report.performedBy,
      });
      await this.refreshDataViewEntities();
    }
    return this.getState();
  }

  async deleteMappingOverride(body: DeleteMappingOverrideRequest): Promise<AdminDashboardUiState> {
    const report = await this.executeOperation(() => this.api.deleteMappingOverride(body));
    if (report) {
      this.mappingOverridesById.delete(body.overrideId);
      await this.refreshDataViewEntities();
    }
    return this.getState();
  }

  async loadHouseholdOperations(householdId?: string): Promise<AdminDashboardUiState> {
    const previous = this.state.views.operations.data;
    this.state.views.operations = createLoadingView(previous);

    try {
      const statuses = this.unwrapEnvelope(await this.api.listHouseholdStatuses());
      const invitations = householdId
        ? this.unwrapEnvelope(await this.api.listHouseholdInvitations({ householdId }))
        : [];

      const nextData = {
        history: previous?.history ?? this.listOperationHistory(),
        lastReport: previous?.lastReport,
        householdStatuses: statuses,
        invitations,
        sessionStatuses: previous?.sessionStatuses ?? [],
      };
      const hasData = statuses.length > 0 || invitations.length > 0 || nextData.history.length > 0;
      this.state.views.operations = hasData ? createSuccessView(nextData) : createEmptyView(nextData);
    } catch (error) {
      this.state.views.operations = createErrorView(toAdminApiError(error), previous);
    }

    return this.getState();
  }

  async resendInvitation(body: HouseholdInviteResendRequest): Promise<AdminDashboardUiState> {
    await this.executeOperation(() => this.api.resendHouseholdInvitation(body));
    return this.getState();
  }

  async resetSession(body: HouseholdSessionResetRequest): Promise<AdminDashboardUiState> {
    await this.executeOperation(() => this.api.resetHouseholdSession(body));
    return this.getState();
  }

  async diagnoseSession(subjectId: string): Promise<AdminDashboardUiState> {
    const previous = this.state.views.operations.data;
    this.state.views.operations = createLoadingView(previous);

    try {
      const diagnostic = this.unwrapEnvelope(await this.api.diagnoseUserSession(subjectId));
      const existing = previous?.sessionStatuses ?? [];
      const merged = [
        diagnostic,
        ...existing.filter((entry) => entry.subjectId !== diagnostic.subjectId),
      ];
      const nextData = {
        history: previous?.history ?? this.listOperationHistory(),
        lastReport: previous?.lastReport,
        householdStatuses: previous?.householdStatuses ?? [],
        invitations: previous?.invitations ?? [],
        sessionStatuses: merged,
      };
      this.state.views.operations = createSuccessView(nextData);
    } catch (error) {
      this.state.views.operations = createErrorView(toAdminApiError(error), previous);
    }

    return this.getState();
  }

  async pgLogin(body: PgLoginRequest): Promise<AdminDashboardUiState> {
    const previous = this.state.views.extract.data;
    this.state.views.extract = createLoadingView(previous);
    try {
      const result = this.unwrapEnvelope(await this.api.pgLogin(body));
      const nextData = {
        jobs: previous?.jobs ?? [],
        pgLoginStatus: {
          cookieNames: result.cookieNames,
          loggedInAt: new Date().toISOString(),
        },
        pgDiscoverResult: previous?.pgDiscoverResult,
      };
      this.state.views.extract = createSuccessView(nextData);
    } catch (error) {
      this.state.views.extract = createErrorView(toAdminApiError(error), previous);
    }
    return this.getState();
  }

  async pgDiscover(year?: number): Promise<AdminDashboardUiState> {
    const previous = this.state.views.extract.data;
    this.state.views.extract = createLoadingView(previous);
    try {
      const result = this.unwrapEnvelope(await this.api.pgDiscover(year));
      const nextData = {
        jobs: previous?.jobs ?? [],
        pgLoginStatus: previous?.pgLoginStatus,
        pgDiscoverResult: result,
      };
      this.state.views.extract =
        result.availableWeeks.length > 0
          ? createSuccessView(nextData)
          : createEmptyView(nextData);
    } catch (error) {
      this.state.views.extract = createErrorView(toAdminApiError(error), previous);
    }
    return this.getState();
  }

  async reprocessFromBronze(): Promise<AdminDashboardUiState> {
    const previous = this.state.views.extract.data;
    this.state.views.extract = createLoadingView(previous);
    try {
      const result = this.unwrapEnvelope(await this.api.reprocessFromBronze());
      this.state.views.extract = createSuccessView({
        jobs: previous?.jobs ?? [],
        pgLoginStatus: previous?.pgLoginStatus,
        pgDiscoverResult: previous?.pgDiscoverResult,
        reprocessResult: result,
      });
    } catch (error) {
      this.state.views.extract = createErrorView(toAdminApiError(error), previous);
    }
    return this.getState();
  }

  async loadEetmeterView(datum?: string): Promise<AdminDashboardUiState> {
    const previous = this.state.views.eetmeter.data;
    this.state.views.eetmeter = createLoadingView(previous);
    try {
      const result = this.unwrapEnvelope(await this.api.getEetmeterDag(datum));
      const hasData = result.isIngelogd && !!result.dag;
      this.state.views.eetmeter = hasData
        ? createSuccessView(result)
        : createEmptyView(result);
    } catch (error) {
      this.state.views.eetmeter = createErrorView(toAdminApiError(error), previous);
    }
    return this.getState();
  }

  async eetmeterLogin(body: EetmeterCredentialsRequest): Promise<AdminDashboardUiState> {
    const previous = this.state.views.eetmeter.data;
    this.state.views.eetmeter = createLoadingView(previous);
    try {
      this.unwrapEnvelope(await this.api.eetmeterLogin(body));
      // Na succesvol inloggen: haal direct de dag op
      return this.loadEetmeterView(previous?.datum);
    } catch (error) {
      this.state.views.eetmeter = createErrorView(toAdminApiError(error), previous);
    }
    return this.getState();
  }

  async ingestRecipeWeb(): Promise<AdminDashboardUiState> {
    const previous = this.state.views.extract.data;
    this.state.views.extract = createLoadingView(previous);
    try {
      const result = this.unwrapEnvelope(await this.api.ingestRecipeWeb());
      this.state.views.extract = createSuccessView({
        jobs: previous?.jobs ?? [],
        pgLoginStatus: previous?.pgLoginStatus,
        pgDiscoverResult: previous?.pgDiscoverResult,
        ingestRecipeWebResult: result,
      });
    } catch (error) {
      this.state.views.extract = createErrorView(toAdminApiError(error), previous);
    }
    return this.getState();
  }

  async discoverAndImportRecipes(): Promise<AdminDashboardUiState> {
    const previous = this.state.views.extract.data;
    this.state.views.extract = createLoadingView(previous);
    try {
      const result = this.unwrapEnvelope(await this.api.discoverAndImportRecipes());
      this.state.views.extract = createSuccessView({
        jobs: previous?.jobs ?? [],
        pgLoginStatus: previous?.pgLoginStatus,
        pgDiscoverResult: previous?.pgDiscoverResult,
        ingestRecipeWebResult: previous?.ingestRecipeWebResult,
        discoverRecipesResult: result,
      });
    } catch (error) {
      this.state.views.extract = createErrorView(toAdminApiError(error), previous);
    }
    return this.getState();
  }

  private async executeOperation(
    run: () => Promise<ApiEnvelope<AdminOperationReport>>,
  ): Promise<AdminOperationReport | null> {
    this.state.views.operations = createLoadingView(this.state.views.operations.data);
    try {
      const report = this.unwrapEnvelope(await run());
      this.operationHistory.push(report);
      await this.loadOperationsView();
      return report;
    } catch (error) {
      this.state.views.operations = createErrorView(
        toAdminApiError(error),
        this.state.views.operations.data,
      );
      return null;
    }
  }

  private unwrapEnvelope<T>(envelope: ApiEnvelope<T>): T {
    if (envelope.ok && envelope.data !== undefined) {
      return envelope.data;
    }
    throw {
      code: envelope.error?.code ?? "API_ERROR",
      message: envelope.error?.message ?? "Admin API call failed.",
      hint: envelope.error?.hint,
    };
  }

  private listOperationHistory(): AdminOperationReport[] {
    return this.operationHistory.map((entry) => structuredClone(entry));
  }

  private listSettingsEntries(): AdminSettingsEntry[] {
    return Array.from(this.settingsByKey.values())
      .map((entry) => structuredClone(entry))
      .sort((left, right) => left.key.localeCompare(right.key));
  }

  private listSettingsAuditTrail(): AdminConfigAuditEntry[] {
    return this.settingsAuditTrail.map((entry) => structuredClone(entry));
  }

  private listRecipesEntries(): AdminRecipeRecord[] {
    return Array.from(this.recipesById.values())
      .map((entry) => structuredClone(entry))
      .sort((left, right) => left.title.localeCompare(right.title));
  }

  private listWeekMenuEntries(): AdminWeekMenuRecord[] {
    return Array.from(this.weekMenusById.values())
      .map((entry) => structuredClone(entry))
      .sort((left, right) => left.week - right.week);
  }

  private listMappingOverrideEntries(): AdminMappingOverrideRecord[] {
    return Array.from(this.mappingOverridesById.values())
      .map((entry) => structuredClone(entry))
      .sort((left, right) => left.sourceKey.localeCompare(right.sourceKey));
  }

  private async refreshDataViewEntities(): Promise<void> {
    const existing = this.state.views.data.data;
    const diagnostics =
      existing?.diagnostics ??
      this.unwrapEnvelope(await this.api.getDiagnostics());
    const goldWeekPlans = existing?.goldWeekPlans ?? [];

    const data = {
      diagnostics,
      recipes: this.listRecipesEntries(),
      weekMenus: this.listWeekMenuEntries(),
      mappingOverrides: this.listMappingOverrideEntries(),
      goldWeekPlans,
    };
    const hasData =
      data.diagnostics.totalJobs > 0 ||
      data.diagnostics.reportsGenerated > 0 ||
      data.recipes.length > 0 ||
      data.weekMenus.length > 0 ||
      data.mappingOverrides.length > 0 ||
      data.goldWeekPlans.length > 0;
    this.state.views.data = hasData ? createSuccessView(data) : createEmptyView(data);
  }

  private validateConfigUpdate(body: ConfigUpdateRequest): AdminApiError | null {
    const rules: Record<string, "string" | "number" | "boolean"> = {
      "feature.toggle": "boolean",
      "matching.highConfidenceMin": "number",
      "matching.autoAcceptMin": "number",
      "llm.model": "string",
      "llm.provider": "string",
      "PG_LOGIN_URL": "string",
      "PG_WEEK_URL_TEMPLATE": "string",
      "PG_DAY_URL_TEMPLATE": "string",
      "PG_RECIPE_URL_TEMPLATE": "string",
      "PG_SHOPPINGLIST_URL_TEMPLATE": "string",
      "SUPABASE_PROJECT_URL": "string",
      "SUPABASE_ANON_KEY": "string",
    };

    const expectedType = rules[body.key];
    if (!expectedType) {
      return {
        code: "INVALID_CONFIG_KEY",
        message: "Config key is not allowed.",
        hint: `Allowed keys: ${Object.keys(rules).join(", ")}`,
      };
    }

    if (typeof body.value !== expectedType) {
      return {
        code: "INVALID_CONFIG_VALUE",
        message: "Config value has invalid type.",
        hint: `Expected ${expectedType} for key ${body.key}.`,
      };
    }

    return null;
  }
}
