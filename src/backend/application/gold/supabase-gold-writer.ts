import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

import type { GoldReadModel, RecipeView } from "./types.ts";
import type { PersistentAppState } from "../../integrations/storage/persistent-state-store.ts";
import { buildSupabaseGoldBackfillSql } from "./supabase-backfill.ts";

export interface SupabaseGoldWriter {
  syncAll(models: GoldReadModel[], recipes: RecipeView[]): void;
}

export interface SupabaseGoldWriterOptions {
  connectionString: string;
  executeSql?: (sql: string) => void;
  importRunSource?: string;
}

function createSyntheticState(models: GoldReadModel[], recipes: RecipeView[]): PersistentAppState {
  return {
    schemaVersion: 7,
    silverTransforms: {},
    goldReadModels: Object.fromEntries(
      models.map((model) => [
        `${model.weekPlan.year}:${model.weekPlan.week}:${model.weekPlan.kcal}:${model.weekPlan.basePersons}`,
        structuredClone(model),
      ]),
    ),
    recipeCatalog: Object.fromEntries(
      recipes
        .filter((recipe) => recipe.recipeId.trim())
        .map((recipe) => [recipe.recipeId, structuredClone(recipe)]),
    ),
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
    pushDeviceTokens: [],
    updatedAt: new Date().toISOString(),
  };
}

export class PsqlSupabaseGoldWriter implements SupabaseGoldWriter {
  private readonly connectionString: string;

  private readonly executeSql?: (sql: string) => void;

  private readonly importRunSource: string;

  constructor(options: SupabaseGoldWriterOptions) {
    this.connectionString = options.connectionString.trim();
    this.executeSql = options.executeSql;
    this.importRunSource = options.importRunSource ?? "dual-write-sync";
  }

  syncAll(models: GoldReadModel[], recipes: RecipeView[]): void {
    const sql = buildSupabaseGoldBackfillSql(
      createSyntheticState(models, recipes),
      {
        importRunId: `sync-${randomUUID()}`,
        source: this.importRunSource,
      },
    );

    if (this.executeSql) {
      this.executeSql(sql);
      return;
    }

    const result = spawnSync("psql", [this.connectionString, "-q", "-v", "ON_ERROR_STOP=1"], {
      input: sql,
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf8",
    });
    if (result.error) {
      throw new Error(`Supabase gold sync: psql niet gevonden of kon niet starten: ${result.error.message}`);
    }
    if (result.status !== 0) {
      const stderr = (result.stderr ?? "").trim();
      const detail = stderr.length > 0 ? stderr.slice(0, 500) : "(geen details)";
      throw new Error(`Supabase gold sync failed (exit ${result.status ?? "?"}): ${detail}`);
    }
  }
}
