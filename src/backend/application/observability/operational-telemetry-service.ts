import type {
  ObservabilityDashboardSnapshot,
  RouteRequestMetrics,
  SecurityEventMetrics,
  SecurityEventType,
  TelemetryReleaseGateInput,
  TelemetryRequestOutcome,
} from "./types.ts";

interface OperationalTelemetryServiceOptions {
  now?: () => string;
}

interface RouteStatsInternal {
  counts: Record<TelemetryRequestOutcome, number>;
  durationSumMs: number;
  durationMaxMs: number;
}

const createEmptyRouteStats = (): RouteStatsInternal => ({
  counts: {
    success: 0,
    client_error: 0,
    server_error: 0,
    forbidden: 0,
    rate_limited: 0,
    waf_blocked: 0,
  },
  durationSumMs: 0,
  durationMaxMs: 0,
});

export class OperationalTelemetryService {
  private readonly routeStatsByKey = new Map<string, RouteStatsInternal>();

  private readonly securityCountsByKey = new Map<string, number>();

  private readonly now: () => string;

  constructor(options?: OperationalTelemetryServiceOptions) {
    this.now = options?.now ?? (() => new Date().toISOString());
  }

  recordRequest(input: {
    routeKey: string;
    outcome: TelemetryRequestOutcome;
    durationMs: number;
  }): void {
    const routeKey = input.routeKey.trim();
    if (!routeKey) {
      return;
    }

    const stats = this.routeStatsByKey.get(routeKey) ?? createEmptyRouteStats();
    stats.counts[input.outcome] += 1;
    const boundedDuration = Math.max(0, Number.isFinite(input.durationMs) ? input.durationMs : 0);
    stats.durationSumMs += boundedDuration;
    stats.durationMaxMs = Math.max(stats.durationMaxMs, boundedDuration);
    this.routeStatsByKey.set(routeKey, stats);
  }

  recordSecurityEvent(input: {
    routeKey: string;
    eventType: SecurityEventType;
  }): void {
    const routeKey = input.routeKey.trim();
    if (!routeKey) {
      return;
    }

    const key = `${routeKey}::${input.eventType}`;
    this.securityCountsByKey.set(key, (this.securityCountsByKey.get(key) ?? 0) + 1);
  }

  getSnapshot(): ObservabilityDashboardSnapshot {
    const routes = this.listRouteMetrics();
    const security = this.listSecurityMetrics();
    const totals = this.calculateTotals(routes);

    return {
      generatedAt: this.now(),
      totals,
      routes,
      security,
      releaseGateInput: this.buildReleaseGateInputWithTotals(totals),
    };
  }

  buildReleaseGateInput(): TelemetryReleaseGateInput {
    const totals = this.calculateTotals(this.listRouteMetrics());
    return this.buildReleaseGateInputWithTotals(totals);
  }

  toPrometheusMetrics(): string {
    const lines: string[] = [];
    const routes = this.listRouteMetrics();
    const security = this.listSecurityMetrics();

    for (const row of routes) {
      lines.push(`menufit_http_requests_total{route="${row.routeKey}",outcome="success"} ${row.successCount}`);
      lines.push(
        `menufit_http_requests_total{route="${row.routeKey}",outcome="client_error"} ${row.clientErrorCount}`,
      );
      lines.push(
        `menufit_http_requests_total{route="${row.routeKey}",outcome="server_error"} ${row.serverErrorCount}`,
      );
      lines.push(`menufit_http_requests_total{route="${row.routeKey}",outcome="forbidden"} ${row.forbiddenCount}`);
      lines.push(
        `menufit_http_requests_total{route="${row.routeKey}",outcome="rate_limited"} ${row.rateLimitedCount}`,
      );
      lines.push(
        `menufit_http_requests_total{route="${row.routeKey}",outcome="waf_blocked"} ${row.wafBlockedCount}`,
      );
      lines.push(`menufit_http_request_duration_avg_ms{route="${row.routeKey}"} ${row.avgDurationMs.toFixed(3)}`);
      lines.push(`menufit_http_request_duration_max_ms{route="${row.routeKey}"} ${row.maxDurationMs.toFixed(3)}`);
    }

    for (const row of security) {
      lines.push(`menufit_security_events_total{route="${row.routeKey}",event="${row.eventType}"} ${row.count}`);
    }

    const gate = this.buildReleaseGateInput();
    lines.push(`menufit_release_gate_success_rate ${gate.successRate.toFixed(6)}`);
    lines.push(`menufit_release_gate_error_rate ${gate.errorRate.toFixed(6)}`);
    lines.push(`menufit_release_gate_blocked_rate ${gate.blockedRate.toFixed(6)}`);

    return lines.join("\n");
  }

  private listRouteMetrics(): RouteRequestMetrics[] {
    return Array.from(this.routeStatsByKey.entries())
      .map(([routeKey, stats]) => {
        const totalRequests = Object.values(stats.counts).reduce((sum, count) => sum + count, 0);
        return {
          routeKey,
          totalRequests,
          successCount: stats.counts.success,
          clientErrorCount: stats.counts.client_error,
          serverErrorCount: stats.counts.server_error,
          forbiddenCount: stats.counts.forbidden,
          rateLimitedCount: stats.counts.rate_limited,
          wafBlockedCount: stats.counts.waf_blocked,
          avgDurationMs: totalRequests === 0 ? 0 : stats.durationSumMs / totalRequests,
          maxDurationMs: stats.durationMaxMs,
        };
      })
      .sort((left, right) => left.routeKey.localeCompare(right.routeKey));
  }

  private listSecurityMetrics(): SecurityEventMetrics[] {
    return Array.from(this.securityCountsByKey.entries())
      .map(([key, count]) => {
        const [routeKey, eventType] = key.split("::");
        return {
          routeKey,
          eventType: eventType as SecurityEventType,
          count,
        };
      })
      .sort(
        (left, right) =>
          left.routeKey.localeCompare(right.routeKey) ||
          left.eventType.localeCompare(right.eventType),
      );
  }

  private calculateTotals(routes: RouteRequestMetrics[]): {
    requests: number;
    blocked: number;
    errors: number;
  } {
    let requests = 0;
    let blocked = 0;
    let errors = 0;

    for (const row of routes) {
      requests += row.totalRequests;
      blocked += row.forbiddenCount + row.rateLimitedCount + row.wafBlockedCount;
      errors += row.clientErrorCount + row.serverErrorCount;
    }

    return { requests, blocked, errors };
  }

  private buildReleaseGateInputWithTotals(totals: {
    requests: number;
    blocked: number;
    errors: number;
  }): TelemetryReleaseGateInput {
    const denominator = totals.requests <= 0 ? 1 : totals.requests;
    const success = Math.max(0, totals.requests - totals.errors - totals.blocked);

    return {
      generatedAt: this.now(),
      totalRequests: totals.requests,
      successRate: success / denominator,
      errorRate: totals.errors / denominator,
      blockedRate: totals.blocked / denominator,
    };
  }
}
