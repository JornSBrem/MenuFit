import { SystemOperationsError, SystemOperationsService } from "../../../application/system/system-operations-service.ts";
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

export const handleSystemHealth = (
  service: SystemOperationsService,
): ApiEnvelope<SystemHealthStatus> => ({
  ok: true,
  data: service.getHealth(),
});

export const handleSystemDiagnostics = (
  service: SystemOperationsService,
): ApiEnvelope<SystemDiagnosticsSummary> => ({
  ok: true,
  data: service.getDiagnostics(),
});

export const handleSystemJobs = (
  service: SystemOperationsService,
): ApiEnvelope<SystemJobRecord[]> => ({
  ok: true,
  data: service.listJobs(),
});

const executeAdminOperation = (
  service: SystemOperationsService,
  operationType: "backup" | "restore" | "cleanup",
  session: AnySessionContext,
  body: SystemOperationBody,
): ApiEnvelope<SystemOperationReport> => {
  const adminActor = withAdminActor(session);
  if (!adminActor.ok || !adminActor.data) {
    return adminActor;
  }

  const validationError = validateOperationBody(body);
  if (validationError) {
    return invalidBody(validationError);
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

    return { ok: true, data: report };
  } catch (error) {
    if (error instanceof SystemOperationsError) {
      return serviceError(error);
    }
    return {
      ok: false,
      error: {
        code: "SYSTEM_OPERATION_ERROR",
        message: "Unexpected system operation failure.",
      },
    };
  }
};

export const handleSystemBackup = (
  service: SystemOperationsService,
  session: AnySessionContext,
  body: SystemOperationBody,
): ApiEnvelope<SystemOperationReport> =>
  executeAdminOperation(service, "backup", session, body);

export const handleSystemRestore = (
  service: SystemOperationsService,
  session: AnySessionContext,
  body: SystemOperationBody,
): ApiEnvelope<SystemOperationReport> =>
  executeAdminOperation(service, "restore", session, body);

export const handleSystemCleanup = (
  service: SystemOperationsService,
  session: AnySessionContext,
  body: SystemOperationBody,
): ApiEnvelope<SystemOperationReport> =>
  executeAdminOperation(service, "cleanup", session, body);

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
): SystemRouteHandlers => ({
  health: () => handleSystemHealth(service),
  diagnostics: () => handleSystemDiagnostics(service),
  jobs: () => handleSystemJobs(service),
  backup: (session, body) => handleSystemBackup(service, session, body),
  restore: (session, body) => handleSystemRestore(service, session, body),
  cleanup: (session, body) => handleSystemCleanup(service, session, body),
});
