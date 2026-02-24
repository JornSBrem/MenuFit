export type SessionKind = "user" | "admin";

interface BaseSessionContext {
  sessionKind: SessionKind;
  subjectId: string;
  tokenId: string;
  expiresAtEpochSeconds?: number;
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

const parseExpirySegment = (segment: string): number => {
  const parsed = Number(segment);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new SessionContextError(
      "INVALID_SESSION_EXPIRY",
      "Session expiry must be a valid unix epoch (seconds).",
      "Use format ...:<expiresAtEpochSeconds>.",
    );
  }
  return parsed;
};

export interface SessionValidationOptions {
  requireExpiry?: boolean;
  nowEpochSeconds?: () => number;
}

export const parseSessionToken = (
  token: string,
  options?: SessionValidationOptions,
): AnySessionContext => {
  const value = token.trim();
  if (!value) {
    throw new SessionContextError("EMPTY_SESSION_TOKEN", "Session token is required.");
  }

  const segments = value.split(":");
  if (segments.length < 4 || segments.length > 5) {
    throw new SessionContextError(
      "INVALID_SESSION_TOKEN",
      "Session token is malformed.",
      "Use token format user:<subject>:<token>:<picnicAccount>[:<expiresAtEpochSeconds>] or admin:<subject>:<token>:<role>[:<expiresAtEpochSeconds>].",
    );
  }

  const sessionKind = assertSegment(
    segments[0],
    "Use token format user:<subject>:<token>:<picnicAccount> or admin:<subject>:<token>:<role>.",
  );
  const subjectId = assertSegment(segments[1], "Token subject segment missing.");
  const tokenId = assertSegment(segments[2], "Token id segment missing.");
  const profileSegment = assertSegment(segments[3], "Token profile segment missing.");
  const expirySegment = segments[4];
  const expiresAtEpochSeconds = expirySegment ? parseExpirySegment(expirySegment) : undefined;

  if (options?.requireExpiry && !expiresAtEpochSeconds) {
    throw new SessionContextError(
      "MISSING_SESSION_EXPIRY",
      "Session token must include expiry.",
      "Add unix expiry as fifth segment.",
    );
  }
  if (expiresAtEpochSeconds) {
    const nowEpochSeconds = options?.nowEpochSeconds ?? (() => Math.floor(Date.now() / 1000));
    if (expiresAtEpochSeconds <= nowEpochSeconds()) {
      throw new SessionContextError("SESSION_EXPIRED", "Session token has expired.");
    }
  }

  if (sessionKind === "user") {
    return {
      sessionKind: "user",
      subjectId,
      tokenId,
      picnicAccountId: profileSegment,
      expiresAtEpochSeconds,
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
      expiresAtEpochSeconds,
    };
  }

  throw new SessionContextError("INVALID_SESSION_KIND", "Session kind is invalid.", "Use user or admin.");
};

export const parseAuthorizationHeader = (
  authorizationHeader: string,
  options?: SessionValidationOptions,
): AnySessionContext => {
  const headerValue = authorizationHeader.trim();
  if (!headerValue.toLowerCase().startsWith("bearer ")) {
    throw new SessionContextError(
      "INVALID_AUTH_HEADER",
      "Authorization header must use Bearer scheme.",
    );
  }

  const token = headerValue.slice("Bearer ".length);
  return parseSessionToken(token, options);
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
