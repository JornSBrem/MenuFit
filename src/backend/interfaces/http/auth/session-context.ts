export type SessionKind = "user" | "admin";

interface BaseSessionContext {
  sessionKind: SessionKind;
  subjectId: string;
  tokenId: string;
}

export interface UserSessionContext extends BaseSessionContext {
  sessionKind: "user";
  picnicAccountId: string;
}

export interface AdminSessionContext extends BaseSessionContext {
  sessionKind: "admin";
  adminRole: "operator" | "owner";
}

export type AnySessionContext = UserSessionContext | AdminSessionContext;

export class SessionContextError extends Error {
  readonly code: string;

  readonly hint?: string;

  constructor(code: string, message: string, hint?: string) {
    super(message);
    this.name = "SessionContextError";
    this.code = code;
    this.hint = hint;
  }
}

const assertSegment = (value: string | undefined, hint: string): string => {
  if (!value || !value.trim()) {
    throw new SessionContextError("INVALID_SESSION_TOKEN", "Session token is malformed.", hint);
  }
  return value.trim();
};

export const parseSessionToken = (token: string): AnySessionContext => {
  const value = token.trim();
  if (!value) {
    throw new SessionContextError("EMPTY_SESSION_TOKEN", "Session token is required.");
  }

  const segments = value.split(":");
  const sessionKind = assertSegment(segments[0], "Use token format user:<subject>:<token>:<picnicAccount> or admin:<subject>:<token>:<role>.");
  const subjectId = assertSegment(segments[1], "Token subject segment missing.");
  const tokenId = assertSegment(segments[2], "Token id segment missing.");
  const profileSegment = assertSegment(segments[3], "Token profile segment missing.");

  if (sessionKind === "user") {
    return {
      sessionKind: "user",
      subjectId,
      tokenId,
      picnicAccountId: profileSegment,
    };
  }

  if (sessionKind === "admin") {
    if (!["operator", "owner"].includes(profileSegment)) {
      throw new SessionContextError(
        "INVALID_ADMIN_ROLE",
        "Admin role is invalid.",
        "Use operator or owner.",
      );
    }
    return {
      sessionKind: "admin",
      subjectId,
      tokenId,
      adminRole: profileSegment as "operator" | "owner",
    };
  }

  throw new SessionContextError("INVALID_SESSION_KIND", "Session kind is invalid.", "Use user or admin.");
};

export const parseAuthorizationHeader = (authorizationHeader: string): AnySessionContext => {
  const headerValue = authorizationHeader.trim();
  if (!headerValue.toLowerCase().startsWith("bearer ")) {
    throw new SessionContextError(
      "INVALID_AUTH_HEADER",
      "Authorization header must use Bearer scheme.",
    );
  }

  const token = headerValue.slice("Bearer ".length);
  return parseSessionToken(token);
};

export const requireUserSession = (context: AnySessionContext): UserSessionContext => {
  if (context.sessionKind !== "user") {
    throw new SessionContextError(
      "FORBIDDEN_SESSION",
      "Route requires user session.",
      "Use user session for end-user routes.",
    );
  }
  return context;
};

export const requireAdminSession = (context: AnySessionContext): AdminSessionContext => {
  if (context.sessionKind !== "admin") {
    throw new SessionContextError(
      "FORBIDDEN_SESSION",
      "Route requires admin session.",
      "Use admin session for ingest/recompute/config/cleanup routes.",
    );
  }
  return context;
};
