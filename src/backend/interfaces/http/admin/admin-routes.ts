import { AdminOperationsService } from "../../../application/admin/admin-operations-service.ts";
import {
  type AdminSessionContext,
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

export interface IngestBody {
  operationId: string;
  weeks: number[];
  kcals: number[];
  basePersons: number[];
}

export interface RecomputeBody {
  operationId: string;
  transformVersion: string;
  week: number;
  kcal: number;
  basePersons: number;
}

export interface ConfigUpdateBody {
  operationId: string;
  key: string;
  value: unknown;
}

export interface CleanupBody {
  operationId: string;
  dryRun: boolean;
  targets: string[];
}

const forbidden = (error: SessionContextError): ApiEnvelope<never> => ({
  ok: false,
  error: {
    code: error.code,
    message: error.message,
    hint: error.hint,
  },
});

const invalidBody = (hint: string): ApiEnvelope<never> => ({
  ok: false,
  error: {
    code: "INVALID_BODY",
    message: "Request body is invalid.",
    hint,
  },
});

const withAdminSession = (
  session: AnySessionContext,
): ApiEnvelope<AdminSessionContext> => {
  try {
    return { ok: true, data: requireAdminSession(session) };
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

const validateIngestBody = (body: IngestBody): string | null => {
  if (!body.operationId?.trim()) {
    return "operationId is required";
  }
  if (!Array.isArray(body.weeks) || body.weeks.length === 0) {
    return "weeks requires at least one value";
  }
  if (!Array.isArray(body.kcals) || body.kcals.length === 0) {
    return "kcals requires at least one value";
  }
  if (!Array.isArray(body.basePersons) || body.basePersons.length === 0) {
    return "basePersons requires at least one value";
  }
  return null;
};

const validateRecomputeBody = (body: RecomputeBody): string | null => {
  if (!body.operationId?.trim()) {
    return "operationId is required";
  }
  if (!body.transformVersion?.trim()) {
    return "transformVersion is required";
  }
  if (!Number.isInteger(body.week) || body.week < 1 || body.week > 53) {
    return "week must be between 1 and 53";
  }
  if (!Number.isInteger(body.kcal) || body.kcal <= 0) {
    return "kcal must be a positive integer";
  }
  if (!Number.isInteger(body.basePersons) || body.basePersons <= 0) {
    return "basePersons must be a positive integer";
  }
  return null;
};

const validateConfigUpdateBody = (body: ConfigUpdateBody): string | null => {
  if (!body.operationId?.trim()) {
    return "operationId is required";
  }
  if (!body.key?.trim()) {
    return "key is required";
  }
  return null;
};

const validateCleanupBody = (body: CleanupBody): string | null => {
  if (!body.operationId?.trim()) {
    return "operationId is required";
  }
  if (typeof body.dryRun !== "boolean") {
    return "dryRun must be boolean";
  }
  if (!Array.isArray(body.targets) || body.targets.length === 0) {
    return "targets requires at least one value";
  }
  return null;
};

export const handleAdminIngest = (
  service: AdminOperationsService,
  session: AnySessionContext,
  body: IngestBody,
): ApiEnvelope<ReturnType<AdminOperationsService["runIngest"]>> => {
  const sessionResult = withAdminSession(session);
  if (!sessionResult.ok || !sessionResult.data) {
    return sessionResult;
  }

  const validationError = validateIngestBody(body);
  if (validationError) {
    return invalidBody(validationError);
  }

  const report = service.runIngest({
    operationId: body.operationId,
    performedBy: sessionResult.data.subjectId,
    weeks: body.weeks,
    kcals: body.kcals,
    basePersons: body.basePersons,
  });
  return { ok: true, data: report };
};

export const handleAdminRecompute = (
  service: AdminOperationsService,
  session: AnySessionContext,
  body: RecomputeBody,
): ApiEnvelope<ReturnType<AdminOperationsService["runRecompute"]>> => {
  const sessionResult = withAdminSession(session);
  if (!sessionResult.ok || !sessionResult.data) {
    return sessionResult;
  }

  const validationError = validateRecomputeBody(body);
  if (validationError) {
    return invalidBody(validationError);
  }

  const report = service.runRecompute({
    operationId: body.operationId,
    performedBy: sessionResult.data.subjectId,
    transformVersion: body.transformVersion,
    week: body.week,
    kcal: body.kcal,
    basePersons: body.basePersons,
  });
  return { ok: true, data: report };
};

export const handleAdminConfigUpdate = (
  service: AdminOperationsService,
  session: AnySessionContext,
  body: ConfigUpdateBody,
): ApiEnvelope<ReturnType<AdminOperationsService["updateConfig"]>> => {
  const sessionResult = withAdminSession(session);
  if (!sessionResult.ok || !sessionResult.data) {
    return sessionResult;
  }

  const validationError = validateConfigUpdateBody(body);
  if (validationError) {
    return invalidBody(validationError);
  }

  const report = service.updateConfig({
    operationId: body.operationId,
    performedBy: sessionResult.data.subjectId,
    key: body.key,
    value: body.value,
  });
  return { ok: true, data: report };
};

export const handleAdminCleanup = (
  service: AdminOperationsService,
  session: AnySessionContext,
  body: CleanupBody,
): ApiEnvelope<ReturnType<AdminOperationsService["runCleanup"]>> => {
  const sessionResult = withAdminSession(session);
  if (!sessionResult.ok || !sessionResult.data) {
    return sessionResult;
  }

  const validationError = validateCleanupBody(body);
  if (validationError) {
    return invalidBody(validationError);
  }

  const report = service.runCleanup({
    operationId: body.operationId,
    performedBy: sessionResult.data.subjectId,
    dryRun: body.dryRun,
    targets: body.targets,
  });
  return { ok: true, data: report };
};

export interface AdminRouteHandlers {
  ingest: (session: AnySessionContext, body: IngestBody) => ApiEnvelope<ReturnType<AdminOperationsService["runIngest"]>>;
  recompute: (
    session: AnySessionContext,
    body: RecomputeBody,
  ) => ApiEnvelope<ReturnType<AdminOperationsService["runRecompute"]>>;
  configUpdate: (
    session: AnySessionContext,
    body: ConfigUpdateBody,
  ) => ApiEnvelope<ReturnType<AdminOperationsService["updateConfig"]>>;
  cleanup: (
    session: AnySessionContext,
    body: CleanupBody,
  ) => ApiEnvelope<ReturnType<AdminOperationsService["runCleanup"]>>;
}

export const createAdminRouteHandlers = (service: AdminOperationsService): AdminRouteHandlers => ({
  ingest: (session, body) => handleAdminIngest(service, session, body),
  recompute: (session, body) => handleAdminRecompute(service, session, body),
  configUpdate: (session, body) => handleAdminConfigUpdate(service, session, body),
  cleanup: (session, body) => handleAdminCleanup(service, session, body),
});
