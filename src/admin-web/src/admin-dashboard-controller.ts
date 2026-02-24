import type {
  AdminApiError,
  AdminAsyncViewState,
  AdminDashboardUiState,
  AdminOperationReport,
  AdminSettingsEntry,
  AdminTab,
  ApiEnvelope,
  CleanupRequest,
  ConfigUpdateRequest,
  IngestRequest,
  RecomputeRequest,
  SystemDiagnosticsSummary,
  SystemJobRecord,
} from "./types.ts";

export interface AdminDashboardApi {
  runIngest(body: IngestRequest): Promise<ApiEnvelope<AdminOperationReport>>;
  runRecompute(body: RecomputeRequest): Promise<ApiEnvelope<AdminOperationReport>>;
  updateConfig(body: ConfigUpdateRequest): Promise<ApiEnvelope<AdminOperationReport>>;
  runCleanup(body: CleanupRequest): Promise<ApiEnvelope<AdminOperationReport>>;
  getDiagnostics(): Promise<ApiEnvelope<SystemDiagnosticsSummary>>;
  getJobs(): Promise<ApiEnvelope<SystemJobRecord[]>>;
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
      }),
      extract: createEmptyView({
        jobs: [],
      }),
      operations: createEmptyView({
        history: [],
      }),
    },
  };

  private readonly operationHistory: AdminOperationReport[] = [];

  private readonly settingsByKey = new Map<string, AdminSettingsEntry>();

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
          })
        : createSuccessView({
            entries,
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
          })
        : createSuccessView({
            history,
            lastReport: history[history.length - 1],
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
    const report = await this.executeOperation(() => this.api.updateConfig(body));
    if (report) {
      this.settingsByKey.set(body.key, {
        key: body.key,
        value: body.value,
        updatedAt: report.createdAt,
        updatedBy: report.performedBy,
      });
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
}
