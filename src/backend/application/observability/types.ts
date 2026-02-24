export type TelemetryRequestOutcome =
  | "success"
  | "client_error"
  | "server_error"
  | "forbidden"
  | "rate_limited"
  | "waf_blocked";

export type SecurityEventType = "rbac_forbidden" | "rate_limited" | "waf_blocked";

export interface RouteRequestMetrics {
  routeKey: string;
  totalRequests: number;
  successCount: number;
  clientErrorCount: number;
  serverErrorCount: number;
  forbiddenCount: number;
  rateLimitedCount: number;
  wafBlockedCount: number;
  avgDurationMs: number;
  maxDurationMs: number;
}

export interface SecurityEventMetrics {
  routeKey: string;
  eventType: SecurityEventType;
  count: number;
}

export interface TelemetryReleaseGateInput {
  generatedAt: string;
  totalRequests: number;
  successRate: number;
  errorRate: number;
  blockedRate: number;
}

export interface ObservabilityDashboardSnapshot {
  generatedAt: string;
  totals: {
    requests: number;
    blocked: number;
    errors: number;
  };
  routes: RouteRequestMetrics[];
  security: SecurityEventMetrics[];
  releaseGateInput: TelemetryReleaseGateInput;
}
