import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  FileLeaseLockCoordinator,
  type DistributedLockCoordinator,
} from "./distributed-lock.ts";

import type { AuditEvent } from "../../application/audit/types.ts";
import type {
  AppSessionRecord,
  ProviderSessionRecord,
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

export const CURRENT_STATE_SCHEMA_VERSION = 4;

export type PersistentStateStoreDriver = "file" | "sqlite";

export interface PersistentStateStoreOptions {
  driver?: PersistentStateStoreDriver;
  lockCoordinator?: DistributedLockCoordinator;
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
] as const;

type MapCollectionName = (typeof MAP_COLLECTIONS)[number];
type ArrayCollectionName = (typeof ARRAY_COLLECTIONS)[number];

const SQLITE_META_SCHEMA_VERSION = "schemaVersion";
const SQLITE_META_UPDATED_AT = "updatedAt";

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

const migrateV3ToV4 = (raw: unknown): PersistentAppState => {
  if (!isRecord(raw)) {
    return defaultState();
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

const migrateState = (raw: unknown): PersistentAppState => {
  const version = isRecord(raw) && typeof raw.schemaVersion === "number" ? raw.schemaVersion : 0;
  if (version <= 0) {
    return migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(migrateV0ToV1(raw))));
  }
  if (version === 1) {
    return migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(raw)));
  }
  if (version === 2) {
    return migrateV3ToV4(migrateV2ToV3(raw));
  }
  if (version === 3) {
    return migrateV3ToV4(raw);
  }
  if (version === 4) {
    return migrateV3ToV4(raw);
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

  private readonly filePath: string;

  private readonly driver: PersistentStateStoreDriver;

  private readonly lockCoordinator: DistributedLockCoordinator;

  private sqliteDb?: DatabaseSync;

  constructor(filePath: string, options?: PersistentStateStoreOptions) {
    this.filePath = filePath;
    this.driver = options?.driver ?? "file";
    this.lockCoordinator =
      options?.lockCoordinator ?? new FileLeaseLockCoordinator(`${this.filePath}.lock`);
  }

  read(): PersistentAppState {
    if (!this.stateCache) {
      this.stateCache = this.loadFromDriver();
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
      const latest = this.readLatestWithoutCache();
      mutator(latest);
      const persisted = this.writeUnsafe(latest);
      return structuredClone(persisted);
    });
  }

  private loadFromDriver(): PersistentAppState {
    return this.driver === "sqlite" ? this.loadFromSqlite() : this.loadFromFile();
  }

  private readLatestWithoutCache(): PersistentAppState {
    if (this.driver === "sqlite") {
      try {
        return migrateState(this.readRawSqliteState(this.ensureSqliteDb()));
      } catch {
        return defaultState();
      }
    }

    try {
      return migrateState(JSON.parse(readFileSync(this.filePath, "utf8")) as unknown);
    } catch {
      return defaultState();
    }
  }

  private writeUnsafe(next: PersistentAppState): PersistentAppState {
    const normalized: PersistentAppState = {
      ...next,
      schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    };

    if (this.driver === "sqlite") {
      this.writeToSqlite(normalized);
    } else {
      this.writeToFile(normalized);
    }

    this.stateCache = normalized;
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
    } catch {
      const created = defaultState();
      this.write(created);
      return created;
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
    } catch {
      const created = defaultState();
      this.write(created);
      return created;
    }
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
