export type AppSessionKind = "user" | "admin";

export type AdminRole = "operator" | "owner";

export interface AppSessionRecord {
  sessionKind: AppSessionKind;
  subjectId: string;
  tokenId: string;
  picnicAccountId?: string;
  adminRole?: AdminRole;
  issuedAtEpochSeconds: number;
  expiresAtEpochSeconds: number;
  refreshedAtEpochSeconds?: number;
  revokedAtEpochSeconds?: number;
}

export type ProviderSessionProvider = "pg" | "picnic";

export interface ProviderSessionRecord {
  provider: ProviderSessionProvider;
  subjectId: string;
  accessToken: string;
  refreshToken?: string;
  issuedAtEpochSeconds: number;
  expiresAtEpochSeconds: number;
  refreshedAtEpochSeconds?: number;
}

export interface UserSessionPayload {
  subjectId: string;
  picnicAccountId: string;
  ttlSeconds?: number;
}

export interface AdminSessionPayload {
  subjectId: string;
  adminRole: AdminRole;
  ttlSeconds?: number;
}

export interface ProviderSessionPayload {
  provider: ProviderSessionProvider;
  subjectId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAtEpochSeconds: number;
}

export interface ProviderSessionRefreshPayload {
  provider: ProviderSessionProvider;
  subjectId: string;
  accessToken: string;
  refreshToken?: string;
  currentRefreshToken?: string;
  expiresAtEpochSeconds: number;
}

export interface UserProfileData {
  displayName?: string;
  birthYear?: number;
  gender?: "male" | "female" | "other";
  weightKg?: number;
  heightCm?: number;
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
  kcalGoal?: number;
  photoPath?: string;
  allergies?: string[];
  dietaryPreferences?: string[];
}

export interface UserAccountRecord {
  userId: string;
  username: string;
  /** E-mailadres (primaire login-identifier na onboarding v2) */
  email?: string;
  /** scrypt:<salt_hex>:<hash_hex> */
  passwordHash: string;
  adminRole?: AdminRole;
  profile?: UserProfileData;
  onboardingCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}
