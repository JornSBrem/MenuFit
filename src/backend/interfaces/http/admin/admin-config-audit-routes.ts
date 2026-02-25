import type { AuditEvent } from "../../../application/audit/types.ts";
import type { AuditTrailService } from "../../../application/audit/audit-trail-service.ts";
import type { AnySessionContext } from "../auth/session-context.ts";
import { requireAdminSession, SessionContextError } from "../auth/session-context.ts";

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    hint?: string;
  };
}

const forbidden = (error: SessionContextError): ApiEnvelope<never> => ({
  ok: false,
  error: {
    code: error.code,
    message: error.message,
    hint: error.hint,
  },
});

const withAdminSession = (session: AnySessionContext): ReturnType<typeof requireAdminSession> | null => {
  try {
    return requireAdminSession(session);
  } catch {
    return null;
  }
};

const withAdminSessionEnvelope = (session: AnySessionContext): ApiEnvelope<ReturnType<typeof requireAdminSession>> => {
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

export interface ConfigAuditFilter {
  actorId?: string;
  configKey?: string;
}

/**
 * Returns all persisted config audit events, optionally filtered by actorId or configKey.
 * Config audit events are category="config" entries recorded by AdminOperationsService.updateConfig().
 */
export const handleListConfigAudit = (
  auditTrail: AuditTrailService,
  session: AnySessionContext,
  filter?: ConfigAuditFilter,
): ApiEnvelope<AuditEvent[]> => {
  const sessionEnvelope = withAdminSessionEnvelope(session);
  if (!sessionEnvelope.ok || !sessionEnvelope.data) {
    return sessionEnvelope;
  }

  let events = auditTrail.list({ category: "config" });

  if (filter?.actorId) {
    const actorId = filter.actorId;
    events = events.filter((e) => e.actorId === actorId);
  }

  if (filter?.configKey) {
    const configKey = filter.configKey;
    events = events.filter((e) => (e.details as { key?: string } | undefined)?.key === configKey);
  }

  return { ok: true, data: events };
};
