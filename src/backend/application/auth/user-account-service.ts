import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";
import type { SessionLifecycleService } from "./session-lifecycle-service.ts";
import type { AdminRole, AppSessionRecord, UserAccountRecord, UserProfileData } from "./types.ts";

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
  email?: string;
  profile?: UserProfileData;
  onboardingCompletedAt?: string;
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

  register(username: string, password: string, options?: { email?: string; profile?: UserProfileData }): AuthResult {
    const normalizedUsername = username.trim().toLowerCase();
    if (normalizedUsername.length < 3) {
      throw new UserAccountServiceError("USERNAME_TOO_SHORT", "Gebruikersnaam moet minimaal 3 tekens bevatten.");
    }
    if (!password || password.length < 6) {
      throw new UserAccountServiceError("PASSWORD_TOO_SHORT", "Wachtwoord moet minimaal 6 tekens bevatten.");
    }

    const normalizedEmail = options?.email?.trim().toLowerCase();
    if (normalizedEmail && !this.isValidEmail(normalizedEmail)) {
      throw new UserAccountServiceError("INVALID_EMAIL", "Ongeldig e-mailadres.");
    }

    const userId = generateUserId();
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();

    const newAccount: UserAccountRecord = {
      userId,
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      profile: options?.profile,
      createdAt: now,
      updatedAt: now,
    };

    this.stateStore.update((draft) => {
      const existing = draft.userAccounts.find((a) => a.username === normalizedUsername);
      if (existing) {
        throw new UserAccountServiceError("USERNAME_TAKEN", "Deze gebruikersnaam is al in gebruik.");
      }
      if (normalizedEmail) {
        const existingEmail = draft.userAccounts.find((a) => a.email === normalizedEmail);
        if (existingEmail) {
          throw new UserAccountServiceError("EMAIL_TAKEN", "Dit e-mailadres is al in gebruik.");
        }
      }
      draft.userAccounts.push(newAccount);
    });

    const { token, session } = this.lifecycle.issueUserSession({
      subjectId: userId,
      picnicAccountId: "no-picnic",
      ttlSeconds: this.tokenTtlSeconds,
    });

    return { token, session, userId, username: normalizedUsername, email: normalizedEmail, profile: options?.profile };
  }

  login(username: string, password: string): AuthResult {
    const normalizedInput = username.trim().toLowerCase();
    const state = this.stateStore.read();
    // Zoek op username of e-mail
    const account = state.userAccounts.find(
      (a) => a.username === normalizedInput || a.email === normalizedInput,
    );

    if (!account || !verifyPassword(password, account.passwordHash)) {
      throw new UserAccountServiceError("INVALID_CREDENTIALS", "Gebruikersnaam of wachtwoord is onjuist.");
    }

    if (account.adminRole) {
      const { token, session } = this.lifecycle.issueAdminSession({
        subjectId: account.userId,
        adminRole: account.adminRole,
        ttlSeconds: this.tokenTtlSeconds,
      });
      return {
        token, session,
        userId: account.userId,
        username: account.username,
        email: account.email,
        profile: account.profile,
        onboardingCompletedAt: account.onboardingCompletedAt,
      };
    }

    const { token, session } = this.lifecycle.issueUserSession({
      subjectId: account.userId,
      picnicAccountId: "no-picnic",
      ttlSeconds: this.tokenTtlSeconds,
    });

    return {
      token, session,
      userId: account.userId,
      username: account.username,
      email: account.email,
      profile: account.profile,
      onboardingCompletedAt: account.onboardingCompletedAt,
    };
  }

  setAdminRole(userId: string, adminRole: AdminRole | null): void {
    this.stateStore.update((draft) => {
      const account = draft.userAccounts.find((a) => a.userId === userId);
      if (!account) {
        throw new UserAccountServiceError("USER_NOT_FOUND", "Gebruiker niet gevonden.");
      }
      if (adminRole === null) {
        delete account.adminRole;
      } else {
        account.adminRole = adminRole;
      }
      account.updatedAt = new Date().toISOString();
    });
  }

  /** Verwijder een gebruikersaccount permanent. */
  deleteAccount(userId: string): void {
    this.stateStore.update((draft) => {
      const index = draft.userAccounts.findIndex((a) => a.userId === userId);
      if (index === -1) {
        throw new UserAccountServiceError("USER_NOT_FOUND", "Gebruiker niet gevonden.");
      }
      draft.userAccounts.splice(index, 1);
    });
  }

  findById(userId: string): UserAccountRecord | undefined {
    const state = this.stateStore.read();
    return state.userAccounts.find((a) => a.userId === userId);
  }

  findByUsername(username: string): UserAccountRecord | undefined {
    const normalizedUsername = username.trim().toLowerCase();
    const state = this.stateStore.read();
    return state.userAccounts.find((a) => a.username === normalizedUsername);
  }

  findByEmail(email: string): UserAccountRecord | undefined {
    const normalizedEmail = email.trim().toLowerCase();
    const state = this.stateStore.read();
    return state.userAccounts.find((a) => a.email === normalizedEmail);
  }

  /** Update profielgegevens van een gebruiker. */
  updateProfile(userId: string, profileUpdate: Partial<UserProfileData>): UserAccountRecord {
    let updatedAccount: UserAccountRecord | undefined;
    this.stateStore.update((draft) => {
      const account = draft.userAccounts.find((a) => a.userId === userId);
      if (!account) {
        throw new UserAccountServiceError("USER_NOT_FOUND", "Gebruiker niet gevonden.");
      }
      account.profile = { ...(account.profile ?? {}), ...profileUpdate };
      account.updatedAt = new Date().toISOString();
      updatedAccount = account;
    });
    return updatedAccount!;
  }

  /** Markeer onboarding als voltooid. */
  completeOnboarding(userId: string): void {
    this.stateStore.update((draft) => {
      const account = draft.userAccounts.find((a) => a.userId === userId);
      if (!account) {
        throw new UserAccountServiceError("USER_NOT_FOUND", "Gebruiker niet gevonden.");
      }
      account.onboardingCompletedAt = new Date().toISOString();
      account.updatedAt = new Date().toISOString();
    });
  }

  /** Bereken BMR-gebaseerde kcal suggestie. */
  suggestKcal(profile: UserProfileData): number | null {
    const { birthYear, gender, weightKg, heightCm, activityLevel } = profile;
    if (!birthYear || !gender || !weightKg || !heightCm) return null;

    const age = new Date().getFullYear() - birthYear;
    // Mifflin-St Jeor formule
    let bmr: number;
    if (gender === "male") {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    } else {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    }

    const multipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    const multiplier = multipliers[activityLevel ?? "moderate"] ?? 1.55;
    return Math.round(bmr * multiplier);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
