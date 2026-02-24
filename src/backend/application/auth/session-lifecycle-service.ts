import type { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";
import type {
  AdminRole,
  AdminSessionPayload,
  AppSessionKind,
  AppSessionRecord,
  ProviderSessionPayload,
  ProviderSessionRecord,
  ProviderSessionRefreshPayload,
  ProviderSessionProvider,
  UserSessionPayload,
} from "./types";

export interface SessionLifecycleServiceOptions {
  nowEpochSeconds?: () => number;
  userTtlSeconds?: number;
  adminTtlSeconds?: number;
  stateStore?: PersistentStateStore;
}

interface ParsedToken {
  sessionKind: AppSessionKind;
  subjectId: string;
  tokenId: string;
  profile: string;
  expiresAtEpochSeconds: number;
}

export class SessionLifecycleError extends Error {
  readonly code: string;

  readonly hint?: string;

  constructor(code: string, message: string, hint?: string) {
    super(message);
    this.name = "SessionLifecycleError";
    this.code = code;
    this.hint = hint;
  }
}

const parseExpiresAt = (value: string): number => {
  const expiresAt = Number(value);
  if (!Number.isInteger(expiresAt) || expiresAt <= 0) {
    throw new SessionLifecycleError(
      "INVALID_SESSION_EXPIRY",
      "Session token expiry is invalid.",
      "Use unix epoch seconds as fifth token segment.",
    );
  }
  return expiresAt;
};

const parseToken = (token: string): ParsedToken => {
  const value = token.trim();
  if (!value) {
    throw new SessionLifecycleError("EMPTY_SESSION_TOKEN", "Session token is required.");
  }

  const segments = value.split(":");
  if (segments.length !== 5) {
    throw new SessionLifecycleError(
      "INVALID_SESSION_TOKEN",
      "Session token is malformed.",
      "Use format <kind>:<subjectId>:<tokenId>:<profile>:<expiresAtEpochSeconds>.",
    );
  }

  const sessionKind = segments[0]?.trim();
  const subjectId = segments[1]?.trim();
  const tokenId = segments[2]?.trim();
  const profile = segments[3]?.trim();
  const expiresAtEpochSeconds = parseExpiresAt(segments[4] ?? "");

  if (!sessionKind || (sessionKind !== "user" && sessionKind !== "admin")) {
    throw new SessionLifecycleError("INVALID_SESSION_KIND", "Session kind is invalid.", "Use user or admin.");
  }
  if (!subjectId || !tokenId || !profile) {
    throw new SessionLifecycleError("INVALID_SESSION_TOKEN", "Session token is malformed.");
  }

  return {
    sessionKind,
    subjectId,
    tokenId,
    profile,
    expiresAtEpochSeconds,
  };
};

const assertNonEmpty = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new SessionLifecycleError("INVALID_INPUT", `${field} is required.`);
  }
  return normalized;
};

const providerKey = (provider: ProviderSessionProvider, subjectId: string): string =>
  `${provider}:${subjectId}`;

export class SessionLifecycleService {
  private readonly appSessionsByTokenId = new Map<string, AppSessionRecord>();

  private readonly providerSessionsByKey = new Map<string, ProviderSessionRecord>();

  private readonly nowEpochSeconds: () => number;

  private readonly userTtlSeconds: number;

  private readonly adminTtlSeconds: number;

  private readonly stateStore?: PersistentStateStore;

  private sessionSequence = 0;

  constructor(options?: SessionLifecycleServiceOptions) {
    this.nowEpochSeconds = options?.nowEpochSeconds ?? (() => Math.floor(Date.now() / 1000));
    this.userTtlSeconds = options?.userTtlSeconds ?? 60 * 60;
    this.adminTtlSeconds = options?.adminTtlSeconds ?? 30 * 60;
    this.stateStore = options?.stateStore;

    if (this.stateStore) {
      const persisted = this.stateStore.read();
      for (const session of persisted.authSessions) {
        this.appSessionsByTokenId.set(session.tokenId, structuredClone(session));
        this.sessionSequence = Math.max(this.sessionSequence, this.parseSessionSequence(session.tokenId));
      }
      for (const session of persisted.providerSessions) {
        this.providerSessionsByKey.set(providerKey(session.provider, session.subjectId), structuredClone(session));
      }
    }
  }

  issueUserSession(payload: UserSessionPayload): { token: string; session: AppSessionRecord } {
    const subjectId = assertNonEmpty(payload.subjectId, "subjectId");
    const picnicAccountId = assertNonEmpty(payload.picnicAccountId, "picnicAccountId");

    return this.issueSession({
      sessionKind: "user",
      subjectId,
      picnicAccountId,
      ttlSeconds: payload.ttlSeconds,
    });
  }

  issueAdminSession(payload: AdminSessionPayload): { token: string; session: AppSessionRecord } {
    const subjectId = assertNonEmpty(payload.subjectId, "subjectId");
    const adminRole = payload.adminRole;
    if (!adminRole || (adminRole !== "operator" && adminRole !== "owner")) {
      throw new SessionLifecycleError("INVALID_ADMIN_ROLE", "Admin role is invalid.", "Use operator or owner.");
    }

    return this.issueSession({
      sessionKind: "admin",
      subjectId,
      adminRole,
      ttlSeconds: payload.ttlSeconds,
    });
  }

  validateSessionToken(
    token: string,
    options?: {
      requiredKind?: AppSessionKind;
    },
  ): AppSessionRecord {
    const parsed = parseToken(token);
    const now = this.nowEpochSeconds();

    if (parsed.expiresAtEpochSeconds <= now) {
      throw new SessionLifecycleError("SESSION_EXPIRED", "Session token has expired.");
    }

    const stored = this.appSessionsByTokenId.get(parsed.tokenId);
    if (!stored) {
      throw new SessionLifecycleError("SESSION_NOT_FOUND", "Session token is unknown.");
    }
    if (stored.revokedAtEpochSeconds) {
      throw new SessionLifecycleError("SESSION_REVOKED", "Session token has been revoked.");
    }
    if (stored.subjectId !== parsed.subjectId || stored.sessionKind !== parsed.sessionKind) {
      throw new SessionLifecycleError("SESSION_MISMATCH", "Session token does not match stored session.");
    }
    if (stored.expiresAtEpochSeconds !== parsed.expiresAtEpochSeconds) {
      throw new SessionLifecycleError("SESSION_MISMATCH", "Session expiry does not match stored session.");
    }
    if (stored.sessionKind === "user" && stored.picnicAccountId !== parsed.profile) {
      throw new SessionLifecycleError("SESSION_MISMATCH", "Session profile does not match stored session.");
    }
    if (stored.sessionKind === "admin" && stored.adminRole !== parsed.profile) {
      throw new SessionLifecycleError("SESSION_MISMATCH", "Session profile does not match stored session.");
    }
    if (stored.expiresAtEpochSeconds <= now) {
      throw new SessionLifecycleError("SESSION_EXPIRED", "Stored session has expired.");
    }

    if (options?.requiredKind && stored.sessionKind !== options.requiredKind) {
      throw new SessionLifecycleError(
        "FORBIDDEN_SESSION",
        `Route requires ${options.requiredKind} session.`,
      );
    }

    return structuredClone(stored);
  }

  refreshSessionToken(token: string, ttlSeconds?: number): { token: string; session: AppSessionRecord } {
    const existing = this.validateSessionToken(token);
    const current = this.appSessionsByTokenId.get(existing.tokenId);
    if (!current) {
      throw new SessionLifecycleError("SESSION_NOT_FOUND", "Session token is unknown.");
    }

    current.revokedAtEpochSeconds = this.nowEpochSeconds();

    return this.issueSession({
      sessionKind: existing.sessionKind,
      subjectId: existing.subjectId,
      picnicAccountId: existing.picnicAccountId,
      adminRole: existing.adminRole,
      ttlSeconds,
      refreshedFrom: existing.tokenId,
    });
  }

  revokeSessionToken(token: string): void {
    const parsed = parseToken(token);
    const stored = this.appSessionsByTokenId.get(parsed.tokenId);
    if (!stored) {
      return;
    }

    if (!stored.revokedAtEpochSeconds) {
      stored.revokedAtEpochSeconds = this.nowEpochSeconds();
      this.persist();
    }
  }

  upsertProviderSession(payload: ProviderSessionPayload): ProviderSessionRecord {
    const subjectId = assertNonEmpty(payload.subjectId, "subjectId");
    const accessToken = assertNonEmpty(payload.accessToken, "accessToken");
    const now = this.nowEpochSeconds();

    if (payload.expiresAtEpochSeconds <= now) {
      throw new SessionLifecycleError(
        "INVALID_PROVIDER_EXPIRY",
        "Provider session expiry must be in the future.",
      );
    }

    const record: ProviderSessionRecord = {
      provider: payload.provider,
      subjectId,
      accessToken,
      refreshToken: payload.refreshToken,
      issuedAtEpochSeconds: now,
      expiresAtEpochSeconds: payload.expiresAtEpochSeconds,
    };

    this.providerSessionsByKey.set(providerKey(payload.provider, subjectId), record);
    this.persist();
    return structuredClone(record);
  }

  getProviderSession(provider: ProviderSessionProvider, subjectId: string): ProviderSessionRecord | null {
    const key = providerKey(provider, assertNonEmpty(subjectId, "subjectId"));
    const record = this.providerSessionsByKey.get(key);
    if (!record) {
      return null;
    }

    if (record.expiresAtEpochSeconds <= this.nowEpochSeconds()) {
      return null;
    }

    return structuredClone(record);
  }

  refreshProviderSession(payload: ProviderSessionRefreshPayload): ProviderSessionRecord {
    const subjectId = assertNonEmpty(payload.subjectId, "subjectId");
    const accessToken = assertNonEmpty(payload.accessToken, "accessToken");
    const key = providerKey(payload.provider, subjectId);
    const existing = this.providerSessionsByKey.get(key);

    if (!existing) {
      throw new SessionLifecycleError("PROVIDER_SESSION_NOT_FOUND", "Provider session does not exist.");
    }
    if (!existing.refreshToken) {
      throw new SessionLifecycleError(
        "PROVIDER_REFRESH_UNAVAILABLE",
        "Provider session has no refresh token.",
      );
    }
    if (payload.currentRefreshToken && existing.refreshToken !== payload.currentRefreshToken) {
      throw new SessionLifecycleError(
        "PROVIDER_REFRESH_MISMATCH",
        "Provided refresh token does not match current provider session.",
      );
    }
    if (payload.expiresAtEpochSeconds <= this.nowEpochSeconds()) {
      throw new SessionLifecycleError(
        "INVALID_PROVIDER_EXPIRY",
        "Provider session expiry must be in the future.",
      );
    }

    const refreshed: ProviderSessionRecord = {
      ...existing,
      accessToken,
      refreshToken: payload.refreshToken ?? existing.refreshToken,
      expiresAtEpochSeconds: payload.expiresAtEpochSeconds,
      refreshedAtEpochSeconds: this.nowEpochSeconds(),
    };

    this.providerSessionsByKey.set(key, refreshed);
    this.persist();
    return structuredClone(refreshed);
  }

  listActiveSessions(): AppSessionRecord[] {
    const now = this.nowEpochSeconds();
    return Array.from(this.appSessionsByTokenId.values())
      .filter((session) => !session.revokedAtEpochSeconds && session.expiresAtEpochSeconds > now)
      .map((session) => structuredClone(session));
  }

  private issueSession(payload: {
    sessionKind: AppSessionKind;
    subjectId: string;
    picnicAccountId?: string;
    adminRole?: AdminRole;
    ttlSeconds?: number;
    refreshedFrom?: string;
  }): { token: string; session: AppSessionRecord } {
    const now = this.nowEpochSeconds();
    const tokenId = this.nextSessionTokenId();
    const ttlSeconds = payload.ttlSeconds ?? (payload.sessionKind === "user" ? this.userTtlSeconds : this.adminTtlSeconds);

    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new SessionLifecycleError("INVALID_TTL", "Session TTL must be a positive integer.");
    }

    const session: AppSessionRecord = {
      sessionKind: payload.sessionKind,
      subjectId: payload.subjectId,
      tokenId,
      picnicAccountId: payload.picnicAccountId,
      adminRole: payload.adminRole,
      issuedAtEpochSeconds: now,
      expiresAtEpochSeconds: now + ttlSeconds,
      refreshedAtEpochSeconds: payload.refreshedFrom ? now : undefined,
    };

    this.appSessionsByTokenId.set(tokenId, session);
    this.persist();

    return {
      token: this.encodeToken(session),
      session: structuredClone(session),
    };
  }

  private encodeToken(session: AppSessionRecord): string {
    if (session.sessionKind === "user") {
      const picnicAccountId = assertNonEmpty(session.picnicAccountId ?? "", "picnicAccountId");
      return `user:${session.subjectId}:${session.tokenId}:${picnicAccountId}:${session.expiresAtEpochSeconds}`;
    }

    const adminRole = session.adminRole;
    if (!adminRole) {
      throw new SessionLifecycleError("INVALID_ADMIN_ROLE", "Admin role is invalid.");
    }
    return `admin:${session.subjectId}:${session.tokenId}:${adminRole}:${session.expiresAtEpochSeconds}`;
  }

  private nextSessionTokenId(): string {
    this.sessionSequence += 1;
    return `sess-${this.sessionSequence}`;
  }

  private parseSessionSequence(tokenId: string): number {
    const match = tokenId.match(/^sess-(\d+)$/);
    if (!match) {
      return 0;
    }
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private persist(): void {
    if (!this.stateStore) {
      return;
    }

    const authSessions = Array.from(this.appSessionsByTokenId.values())
      .map((session) => structuredClone(session))
      .sort(
        (left, right) =>
          left.issuedAtEpochSeconds - right.issuedAtEpochSeconds ||
          left.tokenId.localeCompare(right.tokenId),
      );

    const providerSessions = Array.from(this.providerSessionsByKey.values())
      .map((session) => structuredClone(session))
      .sort(
        (left, right) =>
          providerKey(left.provider, left.subjectId).localeCompare(providerKey(right.provider, right.subjectId)),
      );

    this.stateStore.update((draft) => {
      draft.authSessions = authSessions;
      draft.providerSessions = providerSessions;
    });
  }
}
