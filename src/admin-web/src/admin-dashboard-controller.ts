import type {
  AdminConfigAuditEntry,
  AdminApiError,
  AdminAsyncViewState,
  AdminDashboardUiState,
  AdminOperationReport,
  AdminSettingsEntry,
  AdminTab,
  ApiEnvelope,
  CleanupRequest,
  ConfigUpdateRequest,
  HouseholdInvitationRecord,
  HouseholdInvitationsQuery,
  HouseholdInviteResendRequest,
  HouseholdOperationsStatus,
  HouseholdSessionResetRequest,
  IngestRequest,
  RecomputeRequest,
  SystemDiagnosticsSummary,
  SystemJobRecord,
  UserSessionDiagnostic,
} from "./types.ts";

export interface AdminDashboardApi {
  runIngest(body: IngestRequest): Promise<ApiEnvelope<AdminOperationReport>>;
  runRecompute(body: RecomputeRequest): Promise<ApiEnvelope<AdminOperationReport>>;
  updateConfig(body: ConfigUpdateRequest): Promise<ApiEnvelope<AdminOperationReport>>;
  runCleanup(body: CleanupRequest): Promise<ApiEnvelope<AdminOperationReport>>;
  getDiagnostics(): Promise<ApiEnvelope<SystemDiagnosticsSummary>>;
  getJobs(): Promise<ApiEnvelope<SystemJobRecord[]>>;
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
    },
  };

  private readonly operationHistory: AdminOperationReport[] = [];

  private readonly settingsByKey = new Map<string, AdminSettingsEntry>();
  private readonly settingsAuditTrail: AdminConfigAuditEntry[] = [];

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
      const data = { diagnostics };
      const hasData = diagnostics.totalJobs > 0 || diagnostics.reportsGenerated > 0;
      this.state.views.data = hasData ? createSuccessView(data) : createEmptyView(data);
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
    this.state.views.extract = createLoadingView(this.state.views.extract.data);
    try {
      const jobs = this.unwrapEnvelope(await this.api.getJobs());
      this.state.views.extract =
        jobs.length === 0
          ? createEmptyView({
              jobs: [],
            })
          : createSuccessView({
              jobs,
            });
    } catch (error) {
      this.state.views.extract = createErrorView(toAdminApiError(error), this.state.views.extract.data);
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
    await this.executeOperation(() => this.api.runIngest(body));
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

  private validateConfigUpdate(body: ConfigUpdateRequest): AdminApiError | null {
    const rules: Record<string, "string" | "number" | "boolean"> = {
      "feature.toggle": "boolean",
      "matching.highConfidenceMin": "number",
      "matching.autoAcceptMin": "number",
      "llm.model": "string",
      "llm.provider": "string",
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
