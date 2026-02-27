import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";
import type { SessionLifecycleService } from "./session-lifecycle-service.ts";
import type { AppSessionRecord, UserAccountRecord } from "./types.ts";

export interface UserAccountServiceOptions {
  stateStore: PersistentStateStore;
  lifecycle: SessionLifecycleService;
  tokenTtlSeconds?: number;
}

export interface AuthResult {
  token: string;
  session: AppSessionRecord;
  userId: string;
  username: string;
}

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 32;

const hashPassword = (password: string): string => {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
};

const verifyPassword = (password: string, stored: string): boolean => {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1] ?? "", "hex");
  const expectedHash = Buffer.from(parts[2] ?? "", "hex");
  if (salt.length === 0 || expectedHash.length === 0) return false;
  try {
    const actualHash = scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
    if (actualHash.length !== expectedHash.length) return false;
    return timingSafeEqual(actualHash, expectedHash);
  } catch {
    return false;
  }
};

const generateUserId = (): string => `user-${randomBytes(8).toString("hex")}`;

export class UserAccountServiceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "UserAccountServiceError";
    this.code = code;
  }
}

export class UserAccountService {
  private readonly stateStore: PersistentStateStore;

  private readonly lifecycle: SessionLifecycleService;

  private readonly tokenTtlSeconds: number;

  constructor(options: UserAccountServiceOptions) {
    this.stateStore = options.stateStore;
    this.lifecycle = options.lifecycle;
    this.tokenTtlSeconds = options.tokenTtlSeconds ?? 30 * 24 * 60 * 60;
  }

  register(username: string, password: string): AuthResult {
    const normalizedUsername = username.trim().toLowerCase();
    if (normalizedUsername.length < 3) {
      throw new UserAccountServiceError("USERNAME_TOO_SHORT", "Gebruikersnaam moet minimaal 3 tekens bevatten.");
    }
    if (!password || password.length < 6) {
      throw new UserAccountServiceError("PASSWORD_TOO_SHORT", "Wachtwoord moet minimaal 6 tekens bevatten.");
    }

    const userId = generateUserId();
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();

    const newAccount: UserAccountRecord = {
      userId,
      username: normalizedUsername,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    this.stateStore.update((draft) => {
      const existing = draft.userAccounts.find((a) => a.username === normalizedUsername);
      if (existing) {
        throw new UserAccountServiceError("USERNAME_TAKEN", "Deze gebruikersnaam is al in gebruik.");
      }
      draft.userAccounts.push(newAccount);
    });

    const { token, session } = this.lifecycle.issueUserSession({
      subjectId: userId,
      picnicAccountId: "no-picnic",
      ttlSeconds: this.tokenTtlSeconds,
    });

    return { token, session, userId, username: normalizedUsername };
  }

  login(username: string, password: string): AuthResult {
    const normalizedUsername = username.trim().toLowerCase();
    const state = this.stateStore.read();
    const account = state.userAccounts.find((a) => a.username === normalizedUsername);

    if (!account || !verifyPassword(password, account.passwordHash)) {
      throw new UserAccountServiceError("INVALID_CREDENTIALS", "Gebruikersnaam of wachtwoord is onjuist.");
    }

    const { token, session } = this.lifecycle.issueUserSession({
      subjectId: account.userId,
      picnicAccountId: "no-picnic",
      ttlSeconds: this.tokenTtlSeconds,
    });

    return { token, session, userId: account.userId, username: account.username };
  }

  findById(userId: string): UserAccountRecord | undefined {
    const state = this.stateStore.read();
    return state.userAccounts.find((a) => a.userId === userId);
  }
}
