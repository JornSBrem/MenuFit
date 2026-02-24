import type {
  AdminOperationReport,
  AdminSession,
  ApiEnvelope,
  CleanupRequest,
  ConfigUpdateRequest,
  IngestRequest,
  RecomputeRequest,
  SystemDiagnosticsSummary,
  SystemJobRecord,
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

  getDiagnostics(): Promise<ApiEnvelope<SystemDiagnosticsSummary>> {
    return this.get("/api/v3/system/diagnostics");
  }

  getJobs(): Promise<ApiEnvelope<SystemJobRecord[]>> {
    return this.get("/api/v3/system/jobs");
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
