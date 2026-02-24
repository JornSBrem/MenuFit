import type {
  AdminOperationReport,
  AdminSession,
  ApiEnvelope,
  CleanupRequest,
  ConfigUpdateRequest,
  IngestRequest,
  RecomputeRequest,
} from "./types";

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
