import type { OperationalTelemetryService } from "../../../application/observability/operational-telemetry-service.ts";
import type { ObservabilityDashboardSnapshot } from "../../../application/observability/types.ts";
import {
  type AnySessionContext,
  requireAdminSession,
  SessionContextError,
} from "../auth/session-context.ts";

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    hint?: string;
  };
}

export interface MetricsTextPayload {
  contentType: "text/plain; version=0.0.4";
  body: string;
}

const forbidden = (error: SessionContextError): ApiEnvelope<never> => ({
  ok: false,
  error: {
    code: error.code,
    message: error.message,
    hint: error.hint,
  },
});

const withAdmin = (session: AnySessionContext): ApiEnvelope<true> => {
  try {
    requireAdminSession(session);
    return { ok: true, data: true };
  } catch (error) {
    if (error instanceof SessionContextError) {
      return forbidden(error);
    }
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_SESSION",
        message: "Route requires admin session.",
      },
    };
  }
};

export const handleObservabilitySnapshot = (
  telemetry: OperationalTelemetryService,
  session: AnySessionContext,
): ApiEnvelope<ObservabilityDashboardSnapshot> => {
  const allowed = withAdmin(session);
  if (!allowed.ok) {
    return allowed;
  }

  return {
    ok: true,
    data: telemetry.getSnapshot(),
  };
};

export const handleObservabilityMetrics = (
  telemetry: OperationalTelemetryService,
  session: AnySessionContext,
): ApiEnvelope<MetricsTextPayload> => {
  const allowed = withAdmin(session);
  if (!allowed.ok) {
    return allowed;
  }

  return {
    ok: true,
    data: {
      contentType: "text/plain; version=0.0.4",
      body: telemetry.toPrometheusMetrics(),
    },
  };
};

export interface ObservabilityRouteHandlers {
  snapshot: (session: AnySessionContext) => ApiEnvelope<ObservabilityDashboardSnapshot>;
  metrics: (session: AnySessionContext) => ApiEnvelope<MetricsTextPayload>;
}

export const createObservabilityRouteHandlers = (
  telemetry: OperationalTelemetryService,
): ObservabilityRouteHandlers => ({
  snapshot: (session) => handleObservabilitySnapshot(telemetry, session),
  metrics: (session) => handleObservabilityMetrics(telemetry, session),
});
