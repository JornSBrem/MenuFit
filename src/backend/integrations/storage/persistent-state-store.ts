import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

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

export const CURRENT_STATE_SCHEMA_VERSION = 3;

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

type UnknownRecord = Record<string, unknown>;

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

const migrateV2ToV3 = (raw: unknown): PersistentAppState => {
  if (!isRecord(raw)) {
    return defaultState();
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

const migrateState = (raw: unknown): PersistentAppState => {
  const version = isRecord(raw) && typeof raw.schemaVersion === "number" ? raw.schemaVersion : 0;
  if (version <= 0) {
    return migrateV2ToV3(migrateV1ToV2(migrateV0ToV1(raw)));
  }
  if (version === 1) {
    return migrateV2ToV3(migrateV1ToV2(raw));
  }
  if (version === 2) {
    return migrateV2ToV3(raw);
  }
  if (version === 3) {
    return migrateV2ToV3(raw);
  }
  return defaultState();
};

export class PersistentStateStore {
  private stateCache?: PersistentAppState;

  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  read(): PersistentAppState {
    if (!this.stateCache) {
      this.stateCache = this.loadFromDisk();
    }
    return structuredClone(this.stateCache);
  }

  write(next: PersistentAppState): void {
    const normalized: PersistentAppState = {
      ...next,
      schemaVersion: CURRENT_STATE_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    };
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(normalized, null, 2), "utf8");
    this.stateCache = normalized;
  }

  update(mutator: (draft: PersistentAppState) => void): PersistentAppState {
    const draft = this.read();
    mutator(draft);
    this.write(draft);
    return this.read();
  }

  private loadFromDisk(): PersistentAppState {
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
}
