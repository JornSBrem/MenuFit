import { SystemOperationsError, SystemOperationsService } from "../../../application/system/system-operations-service.ts";
import type { OperationalTelemetryService, TelemetryRequestOutcome } from "../../../application/observability/index.ts";
import type { RequestSecurityPolicy } from "../../../application/security/request-security-policy.ts";
import type {
  SystemDiagnosticsSummary,
  SystemHealthStatus,
  SystemJobRecord,
  SystemOperationMode,
  SystemOperationReport,
} from "../../../application/system/types.ts";
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

export interface SystemOperationBody {
  operationId: string;
  mode: SystemOperationMode;
  target: string;
}

export interface SystemRouteRuntimeOptions {
  securityPolicy?: RequestSecurityPolicy;
  telemetry?: OperationalTelemetryService;
  nowMs?: () => number;
}

const invalidBody = (hint: string): ApiEnvelope<never> => ({
  ok: false,
  error: {
    code: "INVALID_BODY",
    message: "Request body is invalid.",
    hint,
  },
});

const serviceError = (error: SystemOperationsError): ApiEnvelope<never> => ({
  ok: false,
  error: {
    code: error.code,
    message: error.message,
    hint: error.hint,
  },
});

const forbidden = (error: SessionContextError): ApiEnvelope<never> => ({
  ok: false,
  error: {
    code: error.code,
    message: error.message,
    hint: error.hint,
  },
});

const validateOperationBody = (body: SystemOperationBody): string | null => {
  if (!body.operationId?.trim()) {
    return "operationId is required";
  }
  if (!["dry-run", "execute"].includes(body.mode)) {
    return "mode must be dry-run or execute";
  }
  if (!body.target?.trim()) {
    return "target is required";
  }
  return null;
};

const withAdminActor = (session: AnySessionContext): ApiEnvelope<string> => {
  try {
    const adminSession = requireAdminSession(session);
    return { ok: true, data: adminSession.subjectId };
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

const classifyTelemetryOutcome = (result: ApiEnvelope<unknown>): TelemetryRequestOutcome => {
  if (result.ok) {
    return "success";
  }

  const code = result.error?.code;
  if (code === "FORBIDDEN_SESSION" || code === "FORBIDDEN_ROLE") {
    return "forbidden";
  }
  if (code === "RATE_LIMITED") {
    return "rate_limited";
  }
  if (code === "WAF_BLOCKED") {
    return "waf_blocked";
  }
  if (code === "INVALID_BODY" || code?.startsWith("INVALID_")) {
    return "client_error";
  }
  return "server_error";
};

const recordTelemetry = (
  routeKey: string,
  startedAtMs: number,
  result: ApiEnvelope<unknown>,
  options?: SystemRouteRuntimeOptions,
): void => {
  const nowMs = options?.nowMs ?? Date.now;
  options?.telemetry?.recordRequest({
    routeKey,
    outcome: classifyTelemetryOutcome(result),
    durationMs: Math.max(0, nowMs() - startedAtMs),
  });
};

const requiredRoleForOperation = (
  operationType: "backup" | "restore" | "cleanup",
): "operator" | "owner" => (operationType === "restore" ? "owner" : "operator");

const enforceSecurityPolicy = (
  routeKey: string,
  actorId: string,
  actorRole: "operator" | "owner",
  requiredRole: "operator" | "owner",
  payload: unknown,
  options?: SystemRouteRuntimeOptions,
): ApiEnvelope<never> | null => {
  if (!options?.securityPolicy) {
    return null;
  }

  const decision = options.securityPolicy.authorize({
    routeKey,
    actorId,
    actorRole,
    requiredRole,
    payload,
  });
  if (decision.ok) {
    return null;
  }

  return {
    ok: false,
    error: {
      code: decision.error.code,
      message: decision.error.message,
      hint: decision.error.hint,
    },
  };
};

export const handleSystemHealth = (
  service: SystemOperationsService,
  options?: SystemRouteRuntimeOptions,
): ApiEnvelope<SystemHealthStatus> => ({
  ...(() => {
    const startedAtMs = (options?.nowMs ?? Date.now)();
    const result: ApiEnvelope<SystemHealthStatus> = {
      ok: true,
      data: service.getHealth(),
    };
    recordTelemetry("system.health", startedAtMs, result, options);
    return result;
  })(),
});

export const handleSystemDiagnostics = (
  service: SystemOperationsService,
  options?: SystemRouteRuntimeOptions,
): ApiEnvelope<SystemDiagnosticsSummary> => ({
  ...(() => {
    const startedAtMs = (options?.nowMs ?? Date.now)();
    const result: ApiEnvelope<SystemDiagnosticsSummary> = {
      ok: true,
      data: service.getDiagnostics(),
    };
    recordTelemetry("system.diagnostics", startedAtMs, result, options);
    return result;
  })(),
});

export const handleSystemJobs = (
  service: SystemOperationsService,
  options?: SystemRouteRuntimeOptions,
): ApiEnvelope<SystemJobRecord[]> => ({
  ...(() => {
    const startedAtMs = (options?.nowMs ?? Date.now)();
    const result: ApiEnvelope<SystemJobRecord[]> = {
      ok: true,
      data: service.listJobs(),
    };
    recordTelemetry("system.jobs", startedAtMs, result, options);
    return result;
  })(),
});

const executeAdminOperation = (
  service: SystemOperationsService,
  operationType: "backup" | "restore" | "cleanup",
  session: AnySessionContext,
  body: SystemOperationBody,
  options?: SystemRouteRuntimeOptions,
): ApiEnvelope<SystemOperationReport> => {
  const routeKey = `system.${operationType}`;
  const startedAtMs = (options?.nowMs ?? Date.now)();
  const finalize = (result: ApiEnvelope<SystemOperationReport>) => {
    recordTelemetry(routeKey, startedAtMs, result, options);
    return result;
  };

  const adminActor = withAdminActor(session);
  if (!adminActor.ok || !adminActor.data) {
    return finalize(adminActor);
  }

  const validationError = validateOperationBody(body);
  if (validationError) {
    return finalize(invalidBody(validationError));
  }

  const actorRole = requireAdminSession(session).adminRole;
  const securityError = enforceSecurityPolicy(
    routeKey,
    adminActor.data,
    actorRole,
    requiredRoleForOperation(operationType),
    body,
    options,
  );
  if (securityError) {
    return finalize(securityError);
  }

  try {
    const request = {
      operationId: body.operationId,
      mode: body.mode,
      actorId: adminActor.data,
      target: body.target,
    };

    const report =
      operationType === "backup"
        ? service.runBackup(request)
        : operationType === "restore"
          ? service.runRestore(request)
          : service.runCleanup(request);

    return finalize({ ok: true, data: report });
  } catch (error) {
    if (error instanceof SystemOperationsError) {
      return finalize(serviceError(error));
    }
    return finalize({
      ok: false,
      error: {
        code: "SYSTEM_OPERATION_ERROR",
        message: "Unexpected system operation failure.",
      },
    });
  }
};

export const handleSystemBackup = (
  service: SystemOperationsService,
  session: AnySessionContext,
  body: SystemOperationBody,
  options?: SystemRouteRuntimeOptions,
): ApiEnvelope<SystemOperationReport> =>
  executeAdminOperation(service, "backup", session, body, options);

export const handleSystemRestore = (
  service: SystemOperationsService,
  session: AnySessionContext,
  body: SystemOperationBody,
  options?: SystemRouteRuntimeOptions,
): ApiEnvelope<SystemOperationReport> =>
  executeAdminOperation(service, "restore", session, body, options);

export const handleSystemCleanup = (
  service: SystemOperationsService,
  session: AnySessionContext,
  body: SystemOperationBody,
  options?: SystemRouteRuntimeOptions,
): ApiEnvelope<SystemOperationReport> =>
  executeAdminOperation(service, "cleanup", session, body, options);

export interface SystemRouteHandlers {
  health: () => ApiEnvelope<SystemHealthStatus>;
  diagnostics: () => ApiEnvelope<SystemDiagnosticsSummary>;
  jobs: () => ApiEnvelope<SystemJobRecord[]>;
  backup: (session: AnySessionContext, body: SystemOperationBody) => ApiEnvelope<SystemOperationReport>;
  restore: (session: AnySessionContext, body: SystemOperationBody) => ApiEnvelope<SystemOperationReport>;
  cleanup: (session: AnySessionContext, body: SystemOperationBody) => ApiEnvelope<SystemOperationReport>;
}

export const createSystemRouteHandlers = (
  service: SystemOperationsService,
  options?: SystemRouteRuntimeOptions,
): SystemRouteHandlers => ({
  health: () => handleSystemHealth(service, options),
  diagnostics: () => handleSystemDiagnostics(service, options),
  jobs: () => handleSystemJobs(service, options),
  backup: (session, body) => handleSystemBackup(service, session, body, options),
  restore: (session, body) => handleSystemRestore(service, session, body, options),
  cleanup: (session, body) => handleSystemCleanup(service, session, body, options),
});
