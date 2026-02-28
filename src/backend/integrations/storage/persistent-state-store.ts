import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import {
  FileLeaseLockCoordinator,
  type DistributedLockCoordinator,
} from "./distributed-lock.ts";

import type { AuditEvent } from "../../application/audit/types.ts";
import type {
  AppSessionRecord,
  ProviderSessionRecord,
  UserAccountRecord,
} from "../../application/auth/types.ts";
import type { CartSyncReport } from "../../application/cart/types.ts";
import type { GoldReadModel } from "../../application/gold/types.ts";
import type {
  HouseholdInvitation,
  HouseholdRecord,
} from "../../application/household/types.ts";
import type {
  MatchAuditEvent,
  MatchOverrideRecord,
  MatchReviewQueueItem,
} from "../../application/matching/types.ts";
import type { SilverTransformOutput } from "../../application/silver/types.ts";
import type { SystemJobRecord, SystemOperationReport } from "../../application/system/types.ts";
import type { RetryQueueEntryRecord, SchedulerRunRecord } from "../../jobs/types.ts";

export const CURRENT_STATE_SCHEMA_VERSION = 5;

export type PersistentStateStoreDriver = "file" | "sqlite" | "postgres";

export interface PersistentStateStoreOptions {
  driver?: PersistentStateStoreDriver;
  lockCoordinator?: DistributedLockCoordinator;
  postgresConnectionString?: string;
  postgresExec?: (sql: string) => string;
}

export interface PersistentAppState {
  schemaVersion: number;
  silverTransforms: Record<string, SilverTransformOutput>;
  goldReadModels: Record<string, GoldReadModel>;
  cartReportsByIdempotencyKey: Record<string, CartSyncReport>;
  systemJobs: SystemJobRecord[];
  systemReports: SystemOperationReport[];
  matchingQueue: MatchReviewQueueItem[];
  matchingAuditTrail: MatchAuditEvent[];
  matchingOverrides: MatchOverrideRecord[];
  auditTrail: AuditEvent[];
  households: HouseholdRecord[];
  householdInvitations: HouseholdInvitation[];
  authSessions: AppSessionRecord[];
  providerSessions: ProviderSessionRecord[];
  schedulerRuns: SchedulerRunRecord[];
  retryQueueEntries: RetryQueueEntryRecord[];
  userAccounts: UserAccountRecord[];
  updatedAt: string;
}

interface PersistentAppStateV4 {
  schemaVersion: 4;
  silverTransforms: Record<string, SilverTransformOutput>;
  goldReadModels: Record<string, GoldReadModel>;
  cartReportsByIdempotencyKey: Record<string, CartSyncReport>;
  systemJobs: SystemJobRecord[];
  systemReports: SystemOperationReport[];
  matchingQueue: MatchReviewQueueItem[];
  matchingAuditTrail: MatchAuditEvent[];
  matchingOverrides: MatchOverrideRecord[];
  auditTrail: AuditEvent[];
  households: HouseholdRecord[];
  householdInvitations: HouseholdInvitation[];
  authSessions: AppSessionRecord[];
  providerSessions: ProviderSessionRecord[];
  schedulerRuns: SchedulerRunRecord[];
  retryQueueEntries: RetryQueueEntryRecord[];
  updatedAt: string;
}

interface PersistentAppStateV1 {
  schemaVersion: 1;
  silverTransforms: Record<string, SilverTransformOutput>;
  goldReadModels: Record<string, GoldReadModel>;
  cartReportsByIdempotencyKey: Record<string, CartSyncReport>;
  systemJobs: SystemJobRecord[];
  systemReports: SystemOperationReport[];
  matchingQueue: MatchReviewQueueItem[];
  matchingAuditTrail: MatchAuditEvent[];
  matchingOverrides: MatchOverrideRecord[];
  auditTrail: AuditEvent[];
  updatedAt: string;
}

interface PersistentAppStateV2 {
  schemaVersion: 2;
  silverTransforms: Record<string, SilverTransformOutput>;
  goldReadModels: Record<string, GoldReadModel>;
  cartReportsByIdempotencyKey: Record<string, CartSyncReport>;
  systemJobs: SystemJobRecord[];
  systemReports: SystemOperationReport[];
  matchingQueue: MatchReviewQueueItem[];
  matchingAuditTrail: MatchAuditEvent[];
  matchingOverrides: MatchOverrideRecord[];
  auditTrail: AuditEvent[];
  households: HouseholdRecord[];
  householdInvitations: HouseholdInvitation[];
  updatedAt: string;
}

interface PersistentAppStateV3 {
  schemaVersion: 3;
  silverTransforms: Record<string, SilverTransformOutput>;
  goldReadModels: Record<string, GoldReadModel>;
  cartReportsByIdempotencyKey: Record<string, CartSyncReport>;
  systemJobs: SystemJobRecord[];
  systemReports: SystemOperationReport[];
  matchingQueue: MatchReviewQueueItem[];
  matchingAuditTrail: MatchAuditEvent[];
  matchingOverrides: MatchOverrideRecord[];
  auditTrail: AuditEvent[];
  households: HouseholdRecord[];
  householdInvitations: HouseholdInvitation[];
  authSessions: AppSessionRecord[];
  providerSessions: ProviderSessionRecord[];
  updatedAt: string;
}

type UnknownRecord = Record<string, unknown>;

const MAP_COLLECTIONS = [
  "silverTransforms",
  "goldReadModels",
  "cartReportsByIdempotencyKey",
] as const;

const ARRAY_COLLECTIONS = [
  "systemJobs",
  "systemReports",
  "matchingQueue",
  "matchingAuditTrail",
  "matchingOverrides",
  "auditTrail",
  "households",
  "householdInvitations",
  "authSessions",
  "providerSessions",
  "schedulerRuns",
  "retryQueueEntries",
  "userAccounts",
] as const;

type MapCollectionName = (typeof MAP_COLLECTIONS)[number];
type ArrayCollectionName = (typeof ARRAY_COLLECTIONS)[number];

const SQLITE_META_SCHEMA_VERSION = "schemaVersion";
const SQLITE_META_UPDATED_AT = "updatedAt";
const POSTGRES_STATE_TABLE = "menufit_state_store";

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asObjectRecord = <T>(value: unknown): Record<string, T> => {
  if (!isRecord(value)) {
    return {};
  }
  const output: Record<string, T> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isRecord(entry)) {
      output[key] = entry as T;
    }
  }
  return output;
};

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const defaultState = (): PersistentAppState => ({
  schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
  silverTransforms: {},
  goldReadModels: {},
  cartReportsByIdempotencyKey: {},
  systemJobs: [],
  systemReports: [],
  matchingQueue: [],
  matchingAuditTrail: [],
  matchingOverrides: [],
  auditTrail: [],
  households: [],
  householdInvitations: [],
  authSessions: [],
  providerSessions: [],
  schedulerRuns: [],
  retryQueueEntries: [],
  userAccounts: [],
  updatedAt: new Date().toISOString(),
});

const migrateV0ToV1 = (raw: unknown): PersistentAppStateV1 => {
  if (!isRecord(raw)) {
    return {
      ...defaultState(),
      schemaVersion: 1,
    };
  }

  const source = raw as UnknownRecord;

  return {
    schemaVersion: 1,
    silverTransforms: asObjectRecord<SilverTransformOutput>(source.silverTransforms ?? source.silver),
    goldReadModels: asObjectRecord<GoldReadModel>(source.goldReadModels ?? source.gold),
    cartReportsByIdempotencyKey: asObjectRecord<CartSyncReport>(
      source.cartReportsByIdempotencyKey ?? source.cartReports,
    ),
    systemJobs: asArray<SystemJobRecord>(source.systemJobs ?? source.jobs),
    systemReports: asArray<SystemOperationReport>(source.systemReports ?? source.systemOperationReports),
    matchingQueue: asArray<MatchReviewQueueItem>(source.matchingQueue),
    matchingAuditTrail: asArray<MatchAuditEvent>(source.matchingAuditTrail),
    matchingOverrides: asArray<MatchOverrideRecord>(source.matchingOverrides),
    auditTrail: asArray<AuditEvent>(source.auditTrail),
    updatedAt:
      typeof source.updatedAt === "string" && source.updatedAt.trim().length > 0
        ? source.updatedAt
        : new Date().toISOString(),
  };
};

const migrateV1ToV2 = (raw: unknown): PersistentAppStateV2 => {
  if (!isRecord(raw)) {
    return {
      ...defaultState(),
      schemaVersion: 2,
    };
  }

  const source = raw as UnknownRecord;

  return {
    schemaVersion: 2,
    silverTransforms: asObjectRecord<SilverTransformOutput>(source.silverTransforms),
    goldReadModels: asObjectRecord<GoldReadModel>(source.goldReadModels),
    cartReportsByIdempotencyKey: asObjectRecord<CartSyncReport>(source.cartReportsByIdempotencyKey),
    systemJobs: asArray<SystemJobRecord>(source.systemJobs),
    systemReports: asArray<SystemOperationReport>(source.systemReports),
    matchingQueue: asArray<MatchReviewQueueItem>(source.matchingQueue),
    matchingAuditTrail: asArray<MatchAuditEvent>(source.matchingAuditTrail),
    matchingOverrides: asArray<MatchOverrideRecord>(source.matchingOverrides),
    auditTrail: asArray<AuditEvent>(source.auditTrail),
    households: asArray<HouseholdRecord>(source.households),
    householdInvitations: asArray<HouseholdInvitation>(
      source.householdInvitations ?? source.invitations,
    ),
    updatedAt:
      typeof source.updatedAt === "string" && source.updatedAt.trim().length > 0
        ? source.updatedAt
        : new Date().toISOString(),
  };
};

const migrateV2ToV3 = (raw: unknown): PersistentAppStateV3 => {
  if (!isRecord(raw)) {
    return {
      ...defaultState(),
      schemaVersion: 3,
    };
  }

  const source = raw as UnknownRecord;

  return {
    schemaVersion: 3,
    silverTransforms: asObjectRecord<SilverTransformOutput>(source.silverTransforms),
    goldReadModels: asObjectRecord<GoldReadModel>(source.goldReadModels),
    cartReportsByIdempotencyKey: asObjectRecord<CartSyncReport>(source.cartReportsByIdempotencyKey),
    systemJobs: asArray<SystemJobRecord>(source.systemJobs),
    systemReports: asArray<SystemOperationReport>(source.systemReports),
    matchingQueue: asArray<MatchReviewQueueItem>(source.matchingQueue),
    matchingAuditTrail: asArray<MatchAuditEvent>(source.matchingAuditTrail),
    matchingOverrides: asArray<MatchOverrideRecord>(source.matchingOverrides),
    auditTrail: asArray<AuditEvent>(source.auditTrail),
    households: asArray<HouseholdRecord>(source.households),
    householdInvitations: asArray<HouseholdInvitation>(source.householdInvitations),
    authSessions: asArray<AppSessionRecord>(source.authSessions),
    providerSessions: asArray<ProviderSessionRecord>(source.providerSessions),
    updatedAt:
      typeof source.updatedAt === "string" && source.updatedAt.trim().length > 0
        ? source.updatedAt
        : new Date().toISOString(),
  };
};

const migrateV3ToV4 = (raw: unknown): PersistentAppStateV4 => {
  if (!isRecord(raw)) {
    return { ...defaultState(), schemaVersion: 4 };
  }

  const source = raw as UnknownRecord;

  return {
    schemaVersion: 4,
    silverTransforms: asObjectRecord<SilverTransformOutput>(source.silverTransforms),
    goldReadModels: asObjectRecord<GoldReadModel>(source.goldReadModels),
    cartReportsByIdempotencyKey: asObjectRecord<CartSyncReport>(source.cartReportsByIdempotencyKey),
    systemJobs: asArray<SystemJobRecord>(source.systemJobs),
    systemReports: asArray<SystemOperationReport>(source.systemReports),
    matchingQueue: asArray<MatchReviewQueueItem>(source.matchingQueue),
    matchingAuditTrail: asArray<MatchAuditEvent>(source.matchingAuditTrail),
    matchingOverrides: asArray<MatchOverrideRecord>(source.matchingOverrides),
    auditTrail: asArray<AuditEvent>(source.auditTrail),
    households: asArray<HouseholdRecord>(source.households),
    householdInvitations: asArray<HouseholdInvitation>(source.householdInvitations),
    authSessions: asArray<AppSessionRecord>(source.authSessions),
    providerSessions: asArray<ProviderSessionRecord>(source.providerSessions),
    schedulerRuns: asArray<SchedulerRunRecord>(source.schedulerRuns),
    retryQueueEntries: asArray<RetryQueueEntryRecord>(source.retryQueueEntries),
    updatedAt:
      typeof source.updatedAt === "string" && source.updatedAt.trim().length > 0
        ? source.updatedAt
        : new Date().toISOString(),
  };
};

const migrateV4ToV5 = (raw: unknown): PersistentAppState => {
  if (!isRecord(raw)) {
    return defaultState();
  }

  const source = raw as UnknownRecord;

  return {
    schemaVersion: 5,
    silverTransforms: asObjectRecord<SilverTransformOutput>(source.silverTransforms),
    goldReadModels: asObjectRecord<GoldReadModel>(source.goldReadModels),
    cartReportsByIdempotencyKey: asObjectRecord<CartSyncReport>(source.cartReportsByIdempotencyKey),
    systemJobs: asArray<SystemJobRecord>(source.systemJobs),
    systemReports: asArray<SystemOperationReport>(source.systemReports),
    matchingQueue: asArray<MatchReviewQueueItem>(source.matchingQueue),
    matchingAuditTrail: asArray<MatchAuditEvent>(source.matchingAuditTrail),
    matchingOverrides: asArray<MatchOverrideRecord>(source.matchingOverrides),
    auditTrail: asArray<AuditEvent>(source.auditTrail),
    households: asArray<HouseholdRecord>(source.households),
    householdInvitations: asArray<HouseholdInvitation>(source.householdInvitations),
    authSessions: asArray<AppSessionRecord>(source.authSessions),
    providerSessions: asArray<ProviderSessionRecord>(source.providerSessions),
    schedulerRuns: asArray<SchedulerRunRecord>(source.schedulerRuns),
    retryQueueEntries: asArray<RetryQueueEntryRecord>(source.retryQueueEntries),
    userAccounts: asArray<UserAccountRecord>(source.userAccounts),
    updatedAt:
      typeof source.updatedAt === "string" && source.updatedAt.trim().length > 0
        ? source.updatedAt
        : new Date().toISOString(),
  };
};

const migrateState = (raw: unknown): PersistentAppState => {
  const version = isRecord(raw) && typeof raw.schemaVersion === "number" ? raw.schemaVersion : 0;
  if (version <= 0) {
    return migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(migrateV0ToV1(raw)))));
  }
  if (version === 1) {
    return migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(raw))));
  }
  if (version === 2) {
    return migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(raw)));
  }
  if (version === 3) {
    return migrateV4ToV5(migrateV3ToV4(raw));
  }
  if (version === 4) {
    return migrateV4ToV5(raw);
  }
  if (version === 5) {
    return migrateV4ToV5(raw);
  }
  return defaultState();
};

const buildArrayRecordKey = (index: number): string => String(index).padStart(9, "0");

const asMapCollectionName = (value: string): MapCollectionName | null =>
  MAP_COLLECTIONS.includes(value as MapCollectionName) ? (value as MapCollectionName) : null;

const asArrayCollectionName = (value: string): ArrayCollectionName | null =>
  ARRAY_COLLECTIONS.includes(value as ArrayCollectionName) ? (value as ArrayCollectionName) : null;

export class PersistentStateStore {
  private stateCache?: PersistentAppState;

  /** Tracks the highest-ever counts for critical collections to detect data loss. */
  private highWaterMark = { userAccounts: 0, authSessions: 0, households: 0 };

  private readonly filePath: string;

  private readonly driver: PersistentStateStoreDriver;

  private readonly lockCoordinator: DistributedLockCoordinator;

  private readonly postgresConnectionString?: string;

  private readonly postgresExec?: (sql: string) => string;

  private sqliteDb?: DatabaseSync;

  constructor(filePath: string, options?: PersistentStateStoreOptions) {
    this.filePath = filePath;
    this.driver = options?.driver ?? "file";
    this.lockCoordinator =
      options?.lockCoordinator ?? new FileLeaseLockCoordinator(`${this.filePath}.lock`);
    this.postgresConnectionString = options?.postgresConnectionString?.trim() || undefined;
    this.postgresExec = options?.postgresExec;
  }

  read(): PersistentAppState {
    if (!this.stateCache) {
      this.stateCache = this.loadFromDriver();
      this.updateHighWaterMark(this.stateCache);
    }
    return structuredClone(this.stateCache);
  }

  write(next: PersistentAppState): void {
    this.withWriteLock(() => {
      this.writeUnsafe(next);
    });
  }

  update(mutator: (draft: PersistentAppState) => void): PersistentAppState {
    return this.withWriteLock(() => {
      const latest = this.readLatestSafe();
      mutator(latest);
      this.validateBeforeWrite(latest);
      const persisted = this.writeUnsafe(latest);
      return structuredClone(persisted);
    });
  }

  private loadFromDriver(): PersistentAppState {
    if (this.driver === "sqlite") {
      return this.loadFromSqlite();
    }
    if (this.driver === "postgres") {
      return this.loadFromPostgres();
    }
    return this.loadFromFile();
  }

  /**
   * Read the latest state from the underlying store, with safety fallback.
   * If the read fails, falls back to stateCache (last known good state) instead of
   * returning an empty defaultState() — which previously caused data wipes.
   */
  private readLatestSafe(): PersistentAppState {
    try {
      return this.readLatestFromDriver();
    } catch (err) {
      // CRITICAL: never return empty state. Fall back to the last known good cache.
      if (this.stateCache) {
        console.error(
          `[PersistentStateStore] READ FAILED — falling back to cached state ` +
          `(${this.stateCache.userAccounts.length} accounts, ` +
          `${Object.keys(this.stateCache.authSessions).length} sessions). ` +
          `Error: ${err instanceof Error ? err.message : String(err)}`
        );
        return structuredClone(this.stateCache);
      }
      // No cache available = first boot or truly empty. Only then is defaultState() ok.
      console.error(
        `[PersistentStateStore] READ FAILED — no cache available, using default state. ` +
        `Error: ${err instanceof Error ? err.message : String(err)}`
      );
      return defaultState();
    }
  }

  /** Read from the underlying driver, throwing on failure (never catches). */
  private readLatestFromDriver(): PersistentAppState {
    if (this.driver === "sqlite") {
      return migrateState(this.readRawSqliteState(this.ensureSqliteDb()));
    }
    if (this.driver === "postgres") {
      this.ensurePostgresSchema();
      return migrateState(this.readRawPostgresState());
    }
    return migrateState(JSON.parse(readFileSync(this.filePath, "utf8")) as unknown);
  }

  /**
   * Validate that a state mutation hasn't accidentally wiped critical collections.
   * Blocks catastrophic data loss (multiple items vanishing at once) while allowing
   * legitimate single-item deletions (e.g., deleteAccount for last user).
   */
  private validateBeforeWrite(next: PersistentAppState): void {
    const accountCount = next.userAccounts?.length ?? 0;
    const sessionCount = Array.isArray(next.authSessions) ? next.authSessions.length : 0;
    const householdCount = Array.isArray(next.households) ? next.households.length : 0;

    // Block catastrophic wipes: multiple accounts vanishing at once
    const accountsLost = this.highWaterMark.userAccounts - accountCount;
    if (accountsLost > 1) {
      throw new Error(
        `[PersistentStateStore] DATA LOSS BLOCKED: userAccounts would drop from ` +
        `${this.highWaterMark.userAccounts} to ${accountCount} (${accountsLost} lost). Refusing to write.`
      );
    }

    // Block catastrophic session wipe: many sessions vanishing at once
    // (individual revocations don't remove from the array, they set revokedAtEpochSeconds)
    const sessionsLost = this.highWaterMark.authSessions - sessionCount;
    if (sessionsLost > 1) {
      throw new Error(
        `[PersistentStateStore] DATA LOSS BLOCKED: authSessions would drop from ` +
        `${this.highWaterMark.authSessions} to ${sessionCount} (${sessionsLost} lost). Refusing to write.`
      );
    }

    if (this.highWaterMark.households > 0 && householdCount === 0 && accountCount > 0) {
      console.warn(
        `[PersistentStateStore] WARNING: households dropped from ` +
        `${this.highWaterMark.households} to 0.`
      );
    }
  }

  /** Update the high water mark from a known-good state. */
  private updateHighWaterMark(state: PersistentAppState): void {
    this.highWaterMark.userAccounts = Math.max(
      this.highWaterMark.userAccounts,
      state.userAccounts?.length ?? 0,
    );
    this.highWaterMark.authSessions = Math.max(
      this.highWaterMark.authSessions,
      Array.isArray(state.authSessions) ? state.authSessions.length : 0,
    );
    this.highWaterMark.households = Math.max(
      this.highWaterMark.households,
      Array.isArray(state.households) ? state.households.length : 0,
    );
  }

  private writeUnsafe(next: PersistentAppState): PersistentAppState {
    const normalized: PersistentAppState = {
      ...next,
      schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    };

    if (this.driver === "sqlite") {
      this.writeToSqlite(normalized);
    } else if (this.driver === "postgres") {
      this.writeToPostgres(normalized);
    } else {
      this.writeToFile(normalized);
    }

    this.stateCache = normalized;
    this.updateHighWaterMark(normalized);
    return normalized;
  }

  private withWriteLock<T>(criticalSection: () => T): T {
    return this.lockCoordinator.runExclusive(criticalSection);
  }

  private loadFromFile(): PersistentAppState {
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      const migrated = migrateState(parsed);
      if (
        !isRecord(parsed) ||
        typeof parsed.schemaVersion !== "number" ||
        parsed.schemaVersion !== CURRENT_STATE_SCHEMA_VERSION
      ) {
        this.write(migrated);
      }
      return migrated;
    } catch (err: unknown) {
      // Only create default state if the file truly doesn't exist (first boot).
      // For parse errors on an existing file, the data may be recoverable — don't overwrite.
      const isFileNotFound =
        err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT";
      if (isFileNotFound) {
        console.info("[PersistentStateStore] First boot — creating default state file.");
        const created = defaultState();
        this.write(created);
        return created;
      }
      console.error(
        `[PersistentStateStore] CRITICAL: Failed to parse existing state file. ` +
        `NOT overwriting to prevent data loss. Error: ${err instanceof Error ? err.message : String(err)}`
      );
      throw err;
    }
  }

  private writeToFile(next: PersistentAppState): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(next, null, 2), "utf8");
  }

  private loadFromSqlite(): PersistentAppState {
    try {
      const db = this.ensureSqliteDb();
      const rawState = this.readRawSqliteState(db);
      const migrated = migrateState(rawState);
      const rawVersion =
        isRecord(rawState) && typeof rawState.schemaVersion === "number"
          ? rawState.schemaVersion
          : 0;
      if (rawVersion !== CURRENT_STATE_SCHEMA_VERSION) {
        this.write(migrated);
      }
      return migrated;
    } catch (err: unknown) {
      // readRawSqliteState throws "NO_DATA" when the table is empty (first boot).
      const isEmptyTable =
        err instanceof Error && err.message.includes("NO_DATA");
      if (isEmptyTable) {
        console.info("[PersistentStateStore] First boot — creating default SQLite state.");
        const created = defaultState();
        this.write(created);
        return created;
      }
      console.error(
        `[PersistentStateStore] CRITICAL: Failed to read existing SQLite state. ` +
        `NOT overwriting to prevent data loss. Error: ${err instanceof Error ? err.message : String(err)}`
      );
      throw err;
    }
  }

  private loadFromPostgres(): PersistentAppState {
    this.ensurePostgresSchema();
    try {
      const rawState = this.readRawPostgresState();
      const migrated = migrateState(rawState);
      const rawVersion =
        isRecord(rawState) && typeof rawState.schemaVersion === "number"
          ? rawState.schemaVersion
          : 0;
      if (rawVersion !== CURRENT_STATE_SCHEMA_VERSION) {
        this.write(migrated);
      }
      return migrated;
    } catch (err: unknown) {
      // readRawPostgresState throws "NO_DATA" when the table is empty (first boot).
      const isEmptyTable =
        err instanceof Error && err.message.includes("NO_DATA");
      if (isEmptyTable) {
        console.info("[PersistentStateStore] First boot — creating default Postgres state.");
        const created = defaultState();
        this.write(created);
        return created;
      }
      console.error(
        `[PersistentStateStore] CRITICAL: Failed to read existing Postgres state. ` +
        `NOT overwriting to prevent data loss. Error: ${err instanceof Error ? err.message : String(err)}`
      );
      throw err;
    }
  }

  private ensurePostgresSchema(): void {
    this.runPostgresSql(`
      CREATE TABLE IF NOT EXISTS ${POSTGRES_STATE_TABLE} (
        state_id SMALLINT PRIMARY KEY CHECK (state_id = 1),
        schema_version INTEGER NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        state_json JSONB NOT NULL
      );
    `);
  }

  private readRawPostgresState(): unknown {
    const output = this.runPostgresSql(`
      SELECT encode(convert_to(state_json::text, 'UTF8'), 'base64')
      FROM ${POSTGRES_STATE_TABLE}
      WHERE state_id = 1;
    `);

    // PostgreSQL encode(…,'base64') wraps at 76 chars — join all lines.
    const base64 = output
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("");
    if (!base64) {
      throw new Error("NO_DATA: Postgres state table is empty.");
    }

    const jsonText = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(jsonText) as unknown;
  }

  private writeToPostgres(state: PersistentAppState): void {
    this.ensurePostgresSchema();
    const payloadBase64 = Buffer.from(JSON.stringify(state), "utf8").toString("base64");
    this.runPostgresSql(`
      INSERT INTO ${POSTGRES_STATE_TABLE}(state_id, schema_version, updated_at, state_json)
      VALUES (
        1,
        ${CURRENT_STATE_SCHEMA_VERSION},
        NOW(),
        convert_from(decode('${payloadBase64}', 'base64'), 'UTF8')::jsonb
      )
      ON CONFLICT (state_id)
      DO UPDATE SET
        schema_version = EXCLUDED.schema_version,
        updated_at = EXCLUDED.updated_at,
        state_json = EXCLUDED.state_json;
    `);
  }

  private runPostgresSql(sql: string): string {
    if (this.postgresExec) {
      return this.postgresExec(sql);
    }

    const connectionString = this.postgresConnectionString;
    if (!connectionString) {
      throw new Error("STATE_STORE_POSTGRES_URL is required when STATE_STORE_DRIVER=postgres.");
    }

    // Pass SQL via stdin to avoid Linux MAX_ARG_STRLEN (~128 KB) limit
    // that is hit when the state JSON base64 grows large.
    const result = spawnSync(
      "psql",
      [connectionString, "-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1"],
      { encoding: "utf8", input: sql },
    );
    if (result.status !== 0) {
      throw new Error(result.stderr?.trim() || "Postgres command failed.");
    }
    return result.stdout ?? "";
  }

  private ensureSqliteDb(): DatabaseSync {
    if (!this.sqliteDb) {
      mkdirSync(dirname(this.filePath), { recursive: true });
      this.sqliteDb = new DatabaseSync(this.filePath);
      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS state_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS state_records (
          collection TEXT NOT NULL,
          record_key TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          PRIMARY KEY (collection, record_key)
        );
      `);
    }
    return this.sqliteDb;
  }

  private readRawSqliteState(db: DatabaseSync): unknown {
    const metaRows = db
      .prepare("SELECT key, value FROM state_meta")
      .all() as Array<{ key: string; value: string }>;
    const rowMap = new Map(metaRows.map((row) => [row.key, row.value]));
    const schemaVersion = Number(rowMap.get(SQLITE_META_SCHEMA_VERSION) ?? "0");
    const updatedAt = rowMap.get(SQLITE_META_UPDATED_AT) ?? new Date().toISOString();

    const state: Record<string, unknown> = {
      schemaVersion: Number.isInteger(schemaVersion) ? schemaVersion : 0,
      updatedAt,
    };

    for (const collection of MAP_COLLECTIONS) {
      state[collection] = {};
    }
    for (const collection of ARRAY_COLLECTIONS) {
      state[collection] = [];
    }

    const records = db
      .prepare("SELECT collection, record_key, payload_json FROM state_records ORDER BY collection, record_key")
      .all() as Array<{ collection: string; record_key: string; payload_json: string }>;

    for (const record of records) {
      let payload: unknown;
      try {
        payload = JSON.parse(record.payload_json);
      } catch {
        continue;
      }

      const mapCollection = asMapCollectionName(record.collection);
      if (mapCollection) {
        const target = state[mapCollection] as Record<string, unknown>;
        target[record.record_key] = payload;
        continue;
      }

      const arrayCollection = asArrayCollectionName(record.collection);
      if (arrayCollection) {
        (state[arrayCollection] as unknown[]).push(payload);
      }
    }

    return state;
  }

  private writeToSqlite(state: PersistentAppState): void {
    const db = this.ensureSqliteDb();
    db.exec("BEGIN");
    try {
      db.prepare("DELETE FROM state_records").run();

      const insertRecord = db.prepare(
        "INSERT INTO state_records(collection, record_key, payload_json) VALUES (?, ?, ?)",
      );
      const insertMeta = db.prepare(
        "INSERT OR REPLACE INTO state_meta(key, value) VALUES (?, ?)",
      );

      for (const collection of MAP_COLLECTIONS) {
        const records = state[collection] as Record<string, unknown>;
        for (const [recordKey, payload] of Object.entries(records)) {
          insertRecord.run(collection, recordKey, JSON.stringify(payload));
        }
      }

      for (const collection of ARRAY_COLLECTIONS) {
        const records = state[collection] as unknown[];
        for (let index = 0; index < records.length; index += 1) {
          insertRecord.run(
            collection,
            buildArrayRecordKey(index),
            JSON.stringify(records[index]),
          );
        }
      }

      insertMeta.run(SQLITE_META_SCHEMA_VERSION, String(state.schemaVersion));
      insertMeta.run(SQLITE_META_UPDATED_AT, state.updatedAt);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}
