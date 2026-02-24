import type { AdminSessionContext, UserSessionContext } from "./session-context.ts";
import { SessionLifecycleError, SessionLifecycleService } from "../../../application/auth/session-lifecycle-service.ts";

export interface MiddlewareEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    hint?: string;
  };
}

const toError = (error: SessionLifecycleError): MiddlewareEnvelope<never> => ({
  ok: false,
  error: {
    code: error.code,
    message: error.message,
    hint: error.hint,
  },
});

const parseBearerToken = (authorizationHeader: string): string => {
  const header = authorizationHeader.trim();
  if (!header.toLowerCase().startsWith("bearer ")) {
    throw new SessionLifecycleError(
      "INVALID_AUTH_HEADER",
      "Authorization header must use Bearer scheme.",
    );
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    throw new SessionLifecycleError("EMPTY_SESSION_TOKEN", "Session token is required.");
  }
  return token;
};

export const authorizeUserFromBearerHeader = (
  lifecycleService: SessionLifecycleService,
  authorizationHeader: string,
): MiddlewareEnvelope<UserSessionContext> => {
  try {
    const token = parseBearerToken(authorizationHeader);
    const session = lifecycleService.validateSessionToken(token, {
      requiredKind: "user",
    });

    return {
      ok: true,
      data: {
        sessionKind: "user",
        subjectId: session.subjectId,
        tokenId: session.tokenId,
        picnicAccountId: session.picnicAccountId ?? "",
        expiresAtEpochSeconds: session.expiresAtEpochSeconds,
      },
    };
  } catch (error) {
    if (error instanceof SessionLifecycleError) {
      return toError(error);
    }
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Session authorization failed.",
      },
    };
  }
};

export const authorizeAdminFromBearerHeader = (
  lifecycleService: SessionLifecycleService,
  authorizationHeader: string,
): MiddlewareEnvelope<AdminSessionContext> => {
  try {
    const token = parseBearerToken(authorizationHeader);
    const session = lifecycleService.validateSessionToken(token, {
      requiredKind: "admin",
    });

    return {
      ok: true,
      data: {
        sessionKind: "admin",
        subjectId: session.subjectId,
        tokenId: session.tokenId,
        adminRole: session.adminRole ?? "operator",
        expiresAtEpochSeconds: session.expiresAtEpochSeconds,
      },
    };
  } catch (error) {
    if (error instanceof SessionLifecycleError) {
      return toError(error);
    }
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Session authorization failed.",
      },
    };
  }
};
