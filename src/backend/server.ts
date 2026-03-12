/**
 * MenuFit Backend HTTP Server
 *
 * Start:  node --experimental-strip-types src/backend/server.ts
 *
 * Op opstarten wordt een dev admin token én een dev user token geprint naar de
 * console en geschreven naar:
 *   out/dev-admin-token.txt
 *   out/dev-user-token.txt
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createDefaultRuntimeConfig } from "../shared/config/index.ts";
import { AuditTrailService } from "./application/audit/audit-trail-service.ts";
import { AdminOperationsService } from "./application/admin/admin-operations-service.ts";
import { AdminDataService } from "./application/admin/admin-data-service.ts";
import { SystemOperationsService } from "./application/system/system-operations-service.ts";
import { SessionLifecycleService } from "./application/auth/session-lifecycle-service.ts";
import { UserAccountService, UserAccountServiceError } from "./application/auth/user-account-service.ts";
import { resolveAdminRoleFromClaims } from "./application/auth/role-resolver.ts";
import { HouseholdService, HouseholdServiceError } from "./application/household/household-service.ts";
import { PushNotificationService, PushNotificationServiceError } from "./application/push/push-notification-service.ts";
import { GoldWeekReadService, projectSilverToGold } from "./application/gold/index.ts";
import type { GoldReadModel } from "./application/gold/index.ts";
import { PsqlSupabaseGoldWriter } from "./application/gold/supabase-gold-writer.ts";
import { JwksClient } from "./integrations/oidc/jwks-client.ts";
import { JwtVerifier, JwtVerificationError } from "./integrations/oidc/jwt-verifier.ts";
import { EetmeterClient, EetmeterClientError, toEetmeterDatum } from "./integrations/eetmeter/eetmeter-client.ts";
import { reprocessSilverTransforms } from "./application/silver/index.ts";
import type { SilverTransformOutput } from "./application/silver/index.ts";
import { createIngestPlan } from "./application/ingest/ingest-planner.ts";
import { runBronzeIngestTasks, type FetchJson } from "./application/ingest/bronze-runner.ts";
import { mapPgWeekDataToSilverPayload } from "./application/ingest/pg-payload-mapper.ts";
import { fetchPgJson, PgRateLimitError } from "./integrations/pg/pg-fetch.ts";
import { buildPgEndpointUrl } from "./integrations/pg/endpoint-contract.ts";
import { loginToPg, PgLoginError } from "./integrations/pg/pg-login.ts";
import { normalizePgRecipePayload } from "./integrations/pg/pg-recipe-normalizer.ts";
import { discoverAvailableWeeks } from "./integrations/pg/pg-discover.ts";
import { PersistentStateStore } from "./integrations/storage/persistent-state-store.ts";
import { createPersistentStateStore } from "./application/config/create-persistent-state-store.ts";
import {
  authorizeAdminFromBearerHeader,
  authorizeUserFromBearerHeader,
} from "./interfaces/http/auth/session-middleware.ts";
import {
  handleAdminIngest,
  handleAdminRecompute,
  handleAdminConfigUpdate,
  handleAdminCleanup,
} from "./interfaces/http/admin/admin-routes.ts";
import {
  handleListRecipes,
  handleUpsertRecipe,
  handleDeleteRecipe,
  handleListWeekMenus,
  handleUpsertWeekMenu,
  handleDeleteWeekMenu,
  handleListMappingOverrides,
  handleUpsertMappingOverride,
  handleDeleteMappingOverride,
} from "./interfaces/http/admin/admin-data-routes.ts";
import {
  handleSystemDiagnostics,
  handleSystemJobs,
} from "./interfaces/http/system/system-routes.ts";
import { handleWeekSummary, handleWeekGroceries } from "./interfaces/http/week/week-routes.ts";
import {
  handleHouseholdBootstrap,
  handleHouseholdStatus,
  handleHouseholdInvite,
  handleHouseholdAccept,
  handleHouseholdRevoke,
  handleHouseholdInvitations,
} from "./interfaces/http/household/household-routes.ts";

// ---- Config ----------------------------------------------------------------

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const PORT = Number(process.env["APP_PORT"] ?? 3000);
const STATE_PATH =
  process.env["STATE_STORE_PATH"] ?? join(ROOT, "out", "v3", "state", "server-state.json");
const TOKEN_PATH = join(ROOT, "out", "dev-admin-token.txt");
const USER_TOKEN_PATH = join(ROOT, "out", "dev-user-token.txt");
const DEV_OPERATOR_ID = process.env["DEV_OPERATOR_ID"] ?? "dev-admin";
const DEV_USER_ID = process.env["DEV_USER_ID"] ?? "ios-user";
const DEV_PICNIC_ACCOUNT_ID = process.env["DEV_PICNIC_ACCOUNT_ID"] ?? "picnic-default";
const DEV_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days

// ---- Runtime Config --------------------------------------------------------

const config = createDefaultRuntimeConfig(
  Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== undefined),
  ) as Record<string, string>,
);

function getConfiguredSupabaseProjectUrl(): string {
  return (config.get<string>("SUPABASE_PROJECT_URL") || "").replace(/\/+$/, "");
}

function getConfiguredSupabaseAnonKey(): string {
  return (config.get<string>("SUPABASE_ANON_KEY") || "").trim();
}

// ---- Services --------------------------------------------------------------

const stateStore = createPersistentStateStore(config);
console.log(`[boot] State store driver: ${config.get<string>("STATE_STORE_DRIVER") || "file"}`);
const auditTrail = new AuditTrailService();
const lifecycle = new SessionLifecycleService({ stateStore, adminTtlSeconds: DEV_TOKEN_TTL });
const userAccountService = new UserAccountService({ stateStore, lifecycle, tokenTtlSeconds: DEV_TOKEN_TTL });
const adminOps = new AdminOperationsService({ auditTrail });
const adminData = new AdminDataService({ auditTrail });
const systemOps = new SystemOperationsService({ auditTrail });
const householdService = new HouseholdService({ stateStore });
const pushService = new PushNotificationService({ stateStore });
const supabaseGoldDatabaseUrl = (config.get<string>("SUPABASE_GOLD_DATABASE_URL") || "").trim();
const supabaseGoldSyncEnabled = Boolean(config.get<boolean>("SUPABASE_GOLD_SYNC_ENABLED") ?? false);
const goldReadService = new GoldWeekReadService({
  stateStore,
  supabaseGoldWriter:
    supabaseGoldSyncEnabled && supabaseGoldDatabaseUrl
      ? new PsqlSupabaseGoldWriter({
          connectionString: supabaseGoldDatabaseUrl,
        })
      : undefined,
});
if (supabaseGoldSyncEnabled && supabaseGoldDatabaseUrl) {
  console.log("[boot] Supabase gold dual-write enabled");
} else {
  console.log("[boot] Supabase gold dual-write disabled");
}

// ---- Supabase JWT validation (optional, enabled when SUPABASE_PROJECT_URL is set) ---

let supabaseJwtVerifier: JwtVerifier | null = null;

const supabaseProjectUrl = getConfiguredSupabaseProjectUrl();

if (supabaseProjectUrl) {
  const jwksClient = new JwksClient({
    jwksUri: `${supabaseProjectUrl}/auth/v1/.well-known/jwks.json`,
    cacheMaxAgeMs: 60 * 60 * 1000, // 1 uur cache (keys roteren zelden)
  });
  supabaseJwtVerifier = new JwtVerifier({ jwksClient });
  console.log(`[boot] Supabase JWT validation enabled for ${supabaseProjectUrl}`);
} else {
  console.log("[boot] Supabase JWT validation disabled (SUPABASE_PROJECT_URL not set)");
}

// ---- Dev tokens ------------------------------------------------------------

async function bootstrapDevTokens(): Promise<{ adminToken: string; userToken: string }> {
  const { token: adminToken } = lifecycle.issueAdminSession({
    subjectId: DEV_OPERATOR_ID,
    adminRole: "owner",
    ttlSeconds: DEV_TOKEN_TTL,
  });

  const { token: userToken } = lifecycle.issueUserSession({
    subjectId: DEV_USER_ID,
    picnicAccountId: DEV_PICNIC_ACCOUNT_ID,
    ttlSeconds: DEV_TOKEN_TTL,
  });

  await mkdir(join(ROOT, "out"), { recursive: true });
  await writeFile(TOKEN_PATH, adminToken, "utf8");
  await writeFile(USER_TOKEN_PATH, userToken, "utf8");

  return { adminToken, userToken };
}

// ---- Ingest job tracking ---------------------------------------------------

export interface IngestJobStatus {
  jobId: string;
  status: "running" | "completed" | "failed";
  /** Fase: ophalen van unieke URLs bij PG API */
  phase: "fetching" | "processing" | "done";
  /** Aantal unieke URLs al opgehaald */
  fetched: number;
  /** Totaal unieke URLs te ophalen */
  totalFetches: number;
  /** Aantal week×kcal combinaties al verwerkt (silver/gold) */
  processed: number;
  /** Totaal week×kcal combinaties te verwerken */
  totalProcessing: number;
  errors: string[];
  startedAt: string;
  finishedAt?: string;
  tasksRan?: number;
  goldProjected?: number;
}

const activeIngestJobs = new Map<string, IngestJobStatus>();

// ---- Eetmeter clients (één per gebruiker, houdt token in geheugen) ---------
const eetmeterClients = new Map<string, EetmeterClient>();
function getEetmeterClientForUser(userId: string): EetmeterClient {
  if (!eetmeterClients.has(userId)) {
    eetmeterClients.set(userId, new EetmeterClient());
  }
  return eetmeterClients.get(userId)!;
}

// ---- Real ingest pipeline --------------------------------------------------

const TRANSFORM_VERSION = "1.0.0";
const CANONICAL_RULESET_VERSION = "1.0.0";
const SYNONYM_DICT_VERSION = "1.0.0";

/** Wacht ms milliseconden (voor throttling tussen PG API requests) */
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Milliseconden wachten tussen opeenvolgende PG API requests (rate limit) */
const PG_FETCH_DELAY_MS = 4000;
const PG_RECIPE_FETCH_DELAY_MS = 250;

/** Vaste kcal-varianten die de PG API altijd teruggeeft in één weekmenu-response */
const PG_FIXED_KCALS = [1250, 1500, 1800, 2100];

function buildRecipeImageMap(models: GoldReadModel[]): Map<string, string> {
  const imageMap = new Map<string, string>();
  for (const model of models) {
    for (const meal of model.meals) {
      if (meal.recipeId && meal.imageUrl && !imageMap.has(meal.recipeId)) {
        imageMap.set(meal.recipeId, meal.imageUrl);
      }
    }
  }
  return imageMap;
}

async function importNormalizedRecipesForModels(models: GoldReadModel[]): Promise<{
  totalRecipes: number;
  fetched: number;
  imported: number;
  errors: string[];
}> {
  const imageMap = buildRecipeImageMap(models);
  const recipeIds = Array.from(
    new Set(
      models.flatMap((model) => model.meals.map((meal) => meal.recipeId).filter((value): value is string => Boolean(value))),
    ),
  ).sort((a, b) => a.localeCompare(b, "nl"));

  const recipes = [];
  const errors: string[] = [];

  for (let index = 0; index < recipeIds.length; index += 1) {
    const recipeId = recipeIds[index];
    try {
      const requestUrl = buildPgEndpointUrl(config, "recipe", { recipeId });
      const raw = await fetchPgJson({ requestUrl, entityType: "pg.recipe", variables: { recipeId } }, config);
      const recipe = normalizePgRecipePayload(raw, {
        fallbackImageUrl: imageMap.get(recipeId),
        importedAt: new Date().toISOString(),
        sourceUrl: requestUrl,
      });
      if (recipe.recipeId.trim().length > 0) {
        recipes.push(recipe);
      } else {
        errors.push(`${recipeId}: recipe payload had no stable id/slug`);
      }
    } catch (error) {
      errors.push(`${recipeId}: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (index < recipeIds.length - 1) {
      await sleep(PG_RECIPE_FETCH_DELAY_MS);
    }
  }

  goldReadService.upsertRecipes(recipes);

  return {
    totalRecipes: recipeIds.length,
    fetched: recipeIds.length - errors.length,
    imported: recipes.length,
    errors,
  };
}

async function runRealIngest(
  weeks: number[],
  basePersons: number[],
  jobId: string,
): Promise<void> {
  const job = activeIngestJobs.get(jobId);
  if (!job) return;

  try {
    const matrix = { weeks, basePersons };
    const tasks = createIngestPlan(matrix, config);

    // --- Stap 1: dedupliceer op URL — elke unieke URL slechts 1× ophalen ---
    const urlToSampleTask = new Map<string, typeof tasks[0]>();
    for (const task of tasks) {
      if (!urlToSampleTask.has(task.requestUrl)) {
        urlToSampleTask.set(task.requestUrl, task);
      }
    }
    const uniqueUrls = Array.from(urlToSampleTask.keys());
    job.totalFetches = uniqueUrls.length;
    job.phase = "fetching";

    const urlToPayload = new Map<string, unknown>();

    for (let i = 0; i < uniqueUrls.length; i++) {
      const url = uniqueUrls[i];
      const sampleTask = urlToSampleTask.get(url)!;

      // Probeer het request, met één automatische retry na 429
      let attempts = 0;
      while (attempts < 2) {
        try {
          const payload = await fetchPgJson(sampleTask, config);
          urlToPayload.set(url, payload);
          break; // Gelukt
        } catch (err) {
          if (err instanceof PgRateLimitError && attempts === 0) {
            // 429: wacht de opgegeven tijd en probeer dan opnieuw
            const waitMs = Math.max(err.retryAfterMs, 5_000);
            console.log(`[ingest] 429 rate limit — wacht ${Math.round(waitMs / 1000)}s voor ${url}`);
            await sleep(waitMs);
            attempts++;
          } else {
            job.errors.push(
              `Ophalen mislukt voor ${url}: ${err instanceof Error ? err.message : String(err)}`,
            );
            break;
          }
        }
      }

      job.fetched = i + 1;

      // Throttle: niet te snel hammeren op de PG API
      if (i < uniqueUrls.length - 1) {
        await sleep(PG_FETCH_DELAY_MS);
      }
    }

    // --- Stap 2: schrijf bronze-bestanden via gecachte fetch ---
    const cachedFetch: FetchJson = async (url) => {
      const payload = urlToPayload.get(url);
      if (payload === undefined) throw new Error(`Geen gecachte payload voor ${url}`);
      return payload;
    };

    // Alleen taken waarvoor we een payload hebben
    const runnableTasks = tasks.filter((t) => urlToPayload.has(t.requestUrl));
    await runBronzeIngestTasks(runnableTasks, config, cachedFetch, { continueOnError: true });

    // --- Stap 3: silver/gold verwerking per week × vaste kcal-variant ---
    // De PG API geeft altijd data voor alle kcal-varianten in één response.
    // Hier itereren we zelf over de 4 vaste waarden per opgehaalde week.
    const weekMenuTasks = runnableTasks.filter((t) => t.entityType === "pg.week_menu");
    job.phase = "processing";
    job.totalProcessing = weekMenuTasks.length * PG_FIXED_KCALS.length;
    job.processed = 0;

    let goldProjected = 0;
    let silverIdx = 0;

    // Batch-collect silver/gold in-memory, dan één keer persisteren naar postgres
    const allSilverUpdates: Array<{ key: string; output: import("./application/silver/types.ts").SilverTransformOutput }> = [];
    const allGoldModels: import("./application/gold/types.ts").GoldReadModel[] = [];

    for (const task of weekMenuTasks) {
      const rawPayload = urlToPayload.get(task.requestUrl);
      if (!rawPayload) {
        job.errors.push(`Geen payload voor week=${task.week}`);
        silverIdx += PG_FIXED_KCALS.length;
        job.processed = silverIdx;
        continue;
      }

      // task.week is in YYYYWW-formaat (bijv. 202609); splits naar jaar + weeknummer
      const weekNum = task.week % 100;                  // bijv. 9
      const weekYear = Math.floor(task.week / 100);     // bijv. 2026

      // PG weekmenu-data uitpakken (buitenste envelope verwijderen)
      const pgData = (rawPayload as Record<string, unknown>)["data"] ?? rawPayload;

      for (const kcal of PG_FIXED_KCALS) {
        try {
          // Converteer PG day_menus-formaat → BronzeLikeWeekPayload
          const silverPayload = mapPgWeekDataToSilverPayload(pgData, kcal);

          const silverOutputs = reprocessSilverTransforms(
            [
              {
                sourceObjectId: task.requestUrl,
                payload: silverPayload,
                year: weekYear,
                week: weekNum,
                kcal,
                basePersons: task.basePersons,
              },
            ],
            {
              transformVersion: TRANSFORM_VERSION,
              canonicalRulesetVersion: CANONICAL_RULESET_VERSION,
              synonymDictVersion: SYNONYM_DICT_VERSION,
              // Geen stateStore — batch-write achteraf
            },
          );

          for (const silver of silverOutputs) {
            const silverKey = `${weekYear}:${weekNum}:${kcal}:${task.basePersons}:${TRANSFORM_VERSION}`;
            allSilverUpdates.push({ key: silverKey, output: silver });

            const gold = projectSilverToGold({
              silver,
              context: {
                sourceObjectId: task.requestUrl,
                year: weekYear,
                week: weekNum,
                kcal,
                basePersons: task.basePersons,
                transformVersion: TRANSFORM_VERSION,
                canonicalRulesetVersion: CANONICAL_RULESET_VERSION,
                synonymDictVersion: SYNONYM_DICT_VERSION,
              },
            });
            allGoldModels.push(gold);
            goldProjected++;
          }
        } catch (err) {
          job.errors.push(
            `Silver/Gold fout week=${task.week} kcal=${kcal}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        silverIdx++;
        job.processed = silverIdx;
      }
    }

    // Één stateStore-update voor alle silver transforms
    stateStore.update((draft) => {
      for (const { key, output } of allSilverUpdates) {
        draft.silverTransforms[key] = structuredClone(output);
      }
    });

    // Batch-update voor gold (in-memory + één persist-write)
    goldReadService.batchLoad(allGoldModels);
    goldReadService.batchPersist();

    const recipeImport = await importNormalizedRecipesForModels(allGoldModels);
    if (recipeImport.errors.length > 0) {
      job.errors.push(...recipeImport.errors.slice(0, 50));
    }

    job.tasksRan = tasks.length;
    job.goldProjected = goldProjected;
    job.status = "completed";
    job.phase = "done";
    job.finishedAt = new Date().toISOString();
  } catch (err) {
    job.status = "failed";
    job.phase = "done";
    job.errors.push(err instanceof Error ? err.message : String(err));
    job.finishedAt = new Date().toISOString();
  }
}

// ---- HTTP helpers ----------------------------------------------------------

function cors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function json(res: ServerResponse, status: number, body: unknown): void {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function notFound(res: ServerResponse): void {
  json(res, 404, { ok: false, error: { code: "NOT_FOUND", message: "Route not found." } });
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw) as unknown);
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function getAuthHeader(req: IncomingMessage): string {
  const h = req.headers["authorization"];
  return typeof h === "string" ? h : "";
}

/** @see resolveAdminRoleFromClaims — imported from application/auth/role-resolver */

function isSupabasePasswordLoginConfigured(): boolean {
  return Boolean(getConfiguredSupabaseProjectUrl() && getConfiguredSupabaseAnonKey());
}

type SupabasePasswordLoginResult = {
  accessToken: string;
  userId: string;
  email?: string;
  adminRole?: "owner" | "operator";
};

async function loginWithSupabasePassword(email: string, password: string): Promise<SupabasePasswordLoginResult> {
  if (!isSupabasePasswordLoginConfigured()) {
    throw new UserAccountServiceError(
      "SUPABASE_LOGIN_NOT_CONFIGURED",
      "Supabase email/wachtwoord login is niet geconfigureerd op de backend.",
    );
  }

  const supabaseProjectUrl = getConfiguredSupabaseProjectUrl();
  const supabaseAnonKey = getConfiguredSupabaseAnonKey();
  const response = await fetch(`${supabaseProjectUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ email, password }),
  });

  const payload = await response.json() as {
    access_token?: string;
    user?: { id?: string; email?: string };
    error?: string;
    error_description?: string;
    msg?: string;
  };

  if (!response.ok || !payload.access_token) {
    const message =
      payload.error_description ??
      payload.msg ??
      payload.error ??
      "Inloggen bij Supabase mislukt.";
    throw new UserAccountServiceError("SUPABASE_LOGIN_FAILED", message);
  }

  // Derive admin role from the JWT claims in the access token
  let adminRole: "owner" | "operator" | undefined;
  try {
    const jwtParts = payload.access_token.split(".");
    if (jwtParts.length === 3) {
      const claims = JSON.parse(Buffer.from(jwtParts[1]!, "base64url").toString()) as Record<string, unknown>;
      adminRole = resolveAdminRoleFromClaims(claims) ?? undefined;
    }
  } catch {
    // Non-critical: role derivation from JWT is best-effort at login time
  }

  return {
    accessToken: payload.access_token,
    userId: payload.user?.id ?? "",
    email: payload.user?.email,
    adminRole,
  };
}

async function getAdminSession(req: IncomingMessage): Promise<import("./interfaces/http/auth/session-middleware.ts").MiddlewareEnvelope<import("./interfaces/http/auth/session-context.ts").AdminSessionContext>> {
  const internalAdmin = authorizeAdminFromBearerHeader(lifecycle, getAuthHeader(req));
  if (internalAdmin.ok) {
    return internalAdmin;
  }

  const header = getAuthHeader(req);
  const token = header.replace(/^bearer\s+/i, "").trim();
  if (!token.includes(".") || !supabaseJwtVerifier) {
    return internalAdmin;
  }

  try {
    const { claims } = await supabaseJwtVerifier.verify(token, {
      issuer: `${supabaseProjectUrl}/auth/v1`,
      audience: "authenticated",
    });
    const subjectId = String(claims.sub ?? "");
    if (!subjectId) {
      return { ok: false, error: { code: "JWT_INVALID", message: "JWT missing subject claim." } };
    }

    // First trust explicit admin role claims; fallback to backend-admin role mapping.
    let adminRole = resolveAdminRoleFromClaims(claims as Record<string, unknown>);
    if (!adminRole) {
      const account = userAccountService.ensureAccount(subjectId);
      adminRole = account.adminRole ?? null;
    }
    if (!adminRole) {
      return {
        ok: false,
        error: {
          code: "FORBIDDEN_SESSION",
          message: "Route requires admin session.",
          hint: "Set adminRole to operator/owner for this user.",
        },
      };
    }

    return {
      ok: true,
      data: {
        sessionKind: "admin",
        subjectId,
        tokenId: typeof claims.jti === "string" ? claims.jti : "",
        adminRole,
        expiresAtEpochSeconds: typeof claims.exp === "number" ? claims.exp : undefined,
      },
    };
  } catch (error) {
    const message = error instanceof JwtVerificationError ? error.message : "JWT validation failed.";
    return { ok: false, error: { code: "JWT_INVALID", message } };
  }
}

async function validateSupabaseJwt(token: string): Promise<import("./interfaces/http/auth/session-middleware.ts").MiddlewareEnvelope<import("./interfaces/http/auth/session-context.ts").UserSessionContext>> {
  if (!supabaseJwtVerifier) {
    return { ok: false, error: { code: "SUPABASE_NOT_CONFIGURED", message: "Supabase JWT validation is not configured." } };
  }
  try {
    const { claims } = await supabaseJwtVerifier.verify(token, {
      issuer: `${supabaseProjectUrl}/auth/v1`,
      audience: "authenticated",
    });
    return {
      ok: true,
      data: {
        sessionKind: "user",
        subjectId: claims.sub as string,
        tokenId: (claims.jti as string) ?? "",
        picnicAccountId: "",
        expiresAtEpochSeconds: claims.exp as number,
      },
    };
  } catch (error) {
    const message = error instanceof JwtVerificationError ? error.message : "JWT validation failed.";
    return { ok: false, error: { code: "JWT_INVALID", message } };
  }
}

async function getUserSession(req: IncomingMessage) {
  const header = getAuthHeader(req);
  const token = header.replace(/^bearer\s+/i, "").trim();

  // Als het token punten bevat is het een JWT (Supabase), anders een custom token
  if (token.includes(".") && supabaseJwtVerifier) {
    return validateSupabaseJwt(token);
  }

  return authorizeUserFromBearerHeader(lifecycle, header);
}

/** Accepts either a user or admin bearer token, or a Supabase JWT. */
async function getAnySession(req: IncomingMessage) {
  const adminResult = await getAdminSession(req);
  if (adminResult.ok) {
    return adminResult;
  }
  return await getUserSession(req);
}

function queryParam(req: IncomingMessage, name: string): string | undefined {
  const url = new URL(req.url ?? "/", "http://localhost");
  return url.searchParams.get(name) ?? undefined;
}

function numericParam(req: IncomingMessage, name: string): number | undefined {
  const raw = queryParam(req, name);
  if (raw === undefined) {
    return undefined;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

// ---- Router ----------------------------------------------------------------

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method?.toUpperCase() ?? "GET";
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname;

  // CORS preflight
  if (method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check (no auth required)
  if (path === "/health" && method === "GET") {
    json(res, 200, { ok: true, status: "up" });
    return;
  }

  try {
    const body = method === "POST" ? await readBody(req) : {};

    // ---- Week routes (user or admin auth) ----
    if (path === "/api/v3/week/summary" && method === "GET") {
      const authResult = await getAnySession(req);
      if (!authResult.ok || !authResult.data) {
        json(res, 401, {
          ok: false,
          error: authResult.error ?? { code: "UNAUTHORIZED", message: "Auth required." },
        });
        return;
      }
      const query = {
        year: numericParam(req, "year") ?? new Date().getUTCFullYear(),
        week: numericParam(req, "week") ?? 1,
        kcal: numericParam(req, "kcal") ?? 2000,
        basePersons: numericParam(req, "basePersons") ?? 2,
      };
      json(res, 200, handleWeekSummary(goldReadService, query));
      return;
    }

    if (path === "/api/v3/week/groceries" && method === "GET") {
      const authResult = await getAnySession(req);
      if (!authResult.ok || !authResult.data) {
        json(res, 401, {
          ok: false,
          error: authResult.error ?? { code: "UNAUTHORIZED", message: "Auth required." },
        });
        return;
      }
      const query = {
        year: numericParam(req, "year") ?? new Date().getUTCFullYear(),
        week: numericParam(req, "week") ?? 1,
        kcal: numericParam(req, "kcal") ?? 2000,
        basePersons: numericParam(req, "basePersons") ?? 2,
      };
      json(res, 200, handleWeekGroceries(goldReadService, query));
      return;
    }

    if (path === "/api/v3/recipes" && method === "GET") {
      const authResult = await getAnySession(req);
      if (!authResult.ok || !authResult.data) {
        json(res, 401, {
          ok: false,
          error: authResult.error ?? { code: "UNAUTHORIZED", message: "Auth required." },
        });
        return;
      }
      json(res, 200, { ok: true, data: goldReadService.listRecipes() });
      return;
    }

    // ---- Auth routes (geen auth vereist) ----
    if (path === "/api/v3/auth/register" && method === "POST") {
      const { username, password, email, profile } = body as {
        username?: string;
        password?: string;
        email?: string;
        profile?: { displayName?: string; birthYear?: number; gender?: string; weightKg?: number; heightCm?: number; activityLevel?: string; kcalGoal?: number; allergies?: string[]; dietaryPreferences?: string[] };
      };
      if (!username || !password) {
        json(res, 400, { ok: false, error: { code: "INVALID_BODY", message: "username en password zijn verplicht." } });
        return;
      }
      try {
        const result = userAccountService.register(username, password, { email, profile });
        json(res, 201, {
          ok: true,
          data: {
            token: result.token,
            userId: result.userId,
            username: result.username,
            email: result.email,
            profile: result.profile,
            expiresAtEpochSeconds: result.session.expiresAtEpochSeconds,
          },
        });
      } catch (err) {
        const code = err instanceof UserAccountServiceError ? err.code : "REGISTER_FAILED";
        const message = err instanceof Error ? err.message : "Registratie mislukt.";
        json(res, 409, { ok: false, error: { code, message } });
      }
      return;
    }

    if (path === "/api/v3/auth/login" && method === "POST") {
      const { username, password } = body as { username?: string; password?: string };
      if (!username || !password) {
        json(res, 400, { ok: false, error: { code: "INVALID_BODY", message: "username of email en password zijn verplicht." } });
        return;
      }
      try {
        const result = userAccountService.login(username, password);
        json(res, 200, {
          ok: true,
          data: {
            token: result.token,
            userId: result.userId,
            username: result.username,
            email: result.email,
            profile: result.profile,
            onboardingCompletedAt: result.onboardingCompletedAt,
            expiresAtEpochSeconds: result.session.expiresAtEpochSeconds,
          },
        });
      } catch (err) {
        const code = err instanceof UserAccountServiceError ? err.code : "LOGIN_FAILED";
        const message = err instanceof Error ? err.message : "Inloggen mislukt.";
        json(res, 401, { ok: false, error: { code, message } });
      }
      return;
    }

    if (path === "/api/v3/auth/supabase/config" && method === "GET") {
      json(res, 200, {
        ok: true,
        data: {
          enabled: isSupabasePasswordLoginConfigured(),
          projectUrl: getConfiguredSupabaseProjectUrl() || undefined,
        },
      });
      return;
    }

    if (path === "/api/v3/auth/supabase/login" && method === "POST") {
      const { email, password } = body as { email?: string; password?: string };
      if (!email?.trim() || !password) {
        json(res, 400, { ok: false, error: { code: "INVALID_BODY", message: "email en password zijn verplicht." } });
        return;
      }
      try {
        const result = await loginWithSupabasePassword(email.trim(), password);
        json(res, 200, {
          ok: true,
          data: {
            accessToken: result.accessToken,
            userId: result.userId,
            email: result.email ?? email.trim(),
            adminRole: result.adminRole ?? null,
          },
        });
      } catch (err) {
        const code = err instanceof UserAccountServiceError ? err.code : "SUPABASE_LOGIN_FAILED";
        const message = err instanceof Error ? err.message : "Supabase login mislukt.";
        json(res, 401, { ok: false, error: { code, message } });
      }
      return;
    }

    if (path === "/api/v3/auth/me" && method === "GET") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, { ok: false, error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." } });
        return;
      }
      // Auto-provision: maak account aan als het nog niet bestaat (bijv. eerste login via Supabase)
      const account = userAccountService.ensureAccount(userAuth.data.subjectId);
      json(res, 200, {
        ok: true,
        data: {
          userId: userAuth.data.subjectId,
          username: account.username ?? userAuth.data.subjectId,
          email: account.email,
          profile: account.profile,
          onboardingCompletedAt: account.onboardingCompletedAt,
        },
      });
      return;
    }

    if (path === "/api/v3/auth/profile" && method === "POST") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, { ok: false, error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." } });
        return;
      }
      const profileUpdate = body as Record<string, unknown>;
      try {
        const updated = userAccountService.updateProfile(userAuth.data.subjectId, profileUpdate);
        json(res, 200, {
          ok: true,
          data: {
            userId: updated.userId,
            username: updated.username,
            email: updated.email,
            profile: updated.profile,
          },
        });
      } catch (err) {
        const code = err instanceof UserAccountServiceError ? err.code : "PROFILE_UPDATE_FAILED";
        const message = err instanceof Error ? err.message : "Profiel bijwerken mislukt.";
        json(res, 400, { ok: false, error: { code, message } });
      }
      return;
    }

    if (path === "/api/v3/auth/complete-onboarding" && method === "POST") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, { ok: false, error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." } });
        return;
      }
      try {
        userAccountService.completeOnboarding(userAuth.data.subjectId);
        json(res, 200, { ok: true, data: { completed: true } });
      } catch (err) {
        const code = err instanceof UserAccountServiceError ? err.code : "ONBOARDING_FAILED";
        const message = err instanceof Error ? err.message : "Onboarding afronden mislukt.";
        json(res, 400, { ok: false, error: { code, message } });
      }
      return;
    }

    if (path === "/api/v3/auth/suggest-kcal" && method === "POST") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, { ok: false, error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." } });
        return;
      }
      const profileData = body as { birthYear?: number; gender?: string; weightKg?: number; heightCm?: number; activityLevel?: string };
      const suggested = userAccountService.suggestKcal(profileData as any);
      json(res, 200, { ok: true, data: { suggestedKcal: suggested } });
      return;
    }

    // ---- Household routes (user or admin auth) ----
    if (path === "/api/v3/household/create" && method === "POST") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, { ok: false, error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." } });
        return;
      }
      try {
        const household = householdService.createHouseholdWithCode(userAuth.data.subjectId);
        json(res, 200, { ok: true, data: { householdId: household.householdId, inviteCode: household.inviteCode } });
      } catch (err) {
        const code = err instanceof HouseholdServiceError ? err.code : "CREATE_FAILED";
        const message = err instanceof Error ? err.message : "Gezin aanmaken mislukt.";
        json(res, 409, { ok: false, error: { code, message } });
      }
      return;
    }

    if (path === "/api/v3/household/join-by-code" && method === "POST") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, { ok: false, error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." } });
        return;
      }
      const { code } = body as { code?: string };
      if (!code) {
        json(res, 400, { ok: false, error: { code: "INVALID_BODY", message: "code is verplicht." } });
        return;
      }
      try {
        const household = householdService.joinByCode(code, userAuth.data.subjectId);
        json(res, 200, { ok: true, data: { householdId: household.householdId, memberCount: household.members.length } });
      } catch (err) {
        const code2 = err instanceof HouseholdServiceError ? err.code : "JOIN_FAILED";
        const message = err instanceof Error ? err.message : "Koppelen aan gezin mislukt.";
        json(res, 409, { ok: false, error: { code: code2, message } });
      }
      return;
    }

    if (path === "/api/v3/household/rename" && method === "POST") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, { ok: false, error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." } });
        return;
      }
      const { householdId, name } = body as { householdId?: string; name?: string };
      if (!householdId || typeof name !== "string") {
        json(res, 400, { ok: false, error: { code: "INVALID_BODY", message: "householdId en name zijn verplicht." } });
        return;
      }
      try {
        const household = householdService.renameHousehold(householdId, name, userAuth.data.subjectId);
        json(res, 200, { ok: true, data: { householdId: household.householdId, name: household.name } });
      } catch (err) {
        const code2 = err instanceof HouseholdServiceError ? err.code : "RENAME_FAILED";
        const message = err instanceof Error ? err.message : "Hernoemen mislukt.";
        json(res, 409, { ok: false, error: { code: code2, message } });
      }
      return;
    }

    if (path === "/api/v3/household/set-member-kcal" && method === "POST") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, { ok: false, error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." } });
        return;
      }
      const { kcal } = body as { kcal?: number };
      if (!kcal || !Number.isFinite(kcal) || kcal <= 0) {
        json(res, 400, { ok: false, error: { code: "INVALID_BODY", message: "kcal moet een positief getal zijn." } });
        return;
      }
      try {
        const household = householdService.setMemberKcal(userAuth.data.subjectId, kcal);
        json(res, 200, { ok: true, data: { householdId: household.householdId } });
      } catch (err) {
        const code2 = err instanceof HouseholdServiceError ? err.code : "SET_KCAL_FAILED";
        const message = err instanceof Error ? err.message : "Kcal instellen mislukt.";
        json(res, 409, { ok: false, error: { code: code2, message } });
      }
      return;
    }

    if (path === "/api/v3/household/remove-member" && method === "POST") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, { ok: false, error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." } });
        return;
      }
      const { householdId, userId } = body as { householdId?: string; userId?: string };
      if (!householdId || !userId) {
        json(res, 400, { ok: false, error: { code: "INVALID_BODY", message: "householdId en userId zijn verplicht." } });
        return;
      }
      try {
        const household = householdService.removeMember(householdId, userId, userAuth.data.subjectId);
        json(res, 200, { ok: true, data: { householdId: household.householdId, memberCount: household.members.length } });
      } catch (err) {
        const code2 = err instanceof HouseholdServiceError ? err.code : "REMOVE_FAILED";
        const message = err instanceof Error ? err.message : "Lid verwijderen mislukt.";
        json(res, 409, { ok: false, error: { code: code2, message } });
      }
      return;
    }

    if (path === "/api/v3/household/leave" && method === "POST") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, { ok: false, error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." } });
        return;
      }
      try {
        householdService.leaveHousehold(userAuth.data.subjectId);
        json(res, 200, { ok: true, data: { left: true } });
      } catch (err) {
        const code2 = err instanceof HouseholdServiceError ? err.code : "LEAVE_FAILED";
        const message = err instanceof Error ? err.message : "Gezin verlaten mislukt.";
        json(res, 409, { ok: false, error: { code: code2, message } });
      }
      return;
    }

    if (path === "/api/v3/auth/delete-account" && method === "POST") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, { ok: false, error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." } });
        return;
      }
      try {
        const userId = userAuth.data.subjectId;
        // Verwijder gebruiker uit alle gezinnen
        householdService.removeUserFromAllHouseholds(userId);
        // Verwijder het account
        userAccountService.deleteAccount(userId);
        // Sessie ongeldig maken
        lifecycle.invalidateBySubject(userId);
        json(res, 200, { ok: true, data: { deleted: true } });
      } catch (err) {
        const code2 = err instanceof Error && "code" in err ? (err as any).code : "DELETE_FAILED";
        const message = err instanceof Error ? err.message : "Account verwijderen mislukt.";
        json(res, 409, { ok: false, error: { code: code2, message } });
      }
      return;
    }

    if (path === "/api/v3/household/groceries" && method === "GET") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, { ok: false, error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." } });
        return;
      }
      const year = numericParam(req, "year") ?? new Date().getUTCFullYear();
      const week = numericParam(req, "week") ?? 1;
      const basePersons = numericParam(req, "basePersons") ?? 2;

      const household = householdService.getHouseholdForUser(userAuth.data.subjectId);
      if (!household) {
        json(res, 404, { ok: false, error: { code: "HOUSEHOLD_NOT_FOUND", message: "Je bent niet lid van een gezin." } });
        return;
      }

      // Aggregeer boodschappen over alle gezinsleden op basis van hun kcal-voorkeur
      const merged = new Map<string, { totalAmount: number; unit?: string; requiresReview: boolean }>();
      const memberBreakdown: { userId: string; displayName: string; kcal: number; itemCount: number }[] = [];

      for (const member of household.members) {
        const kcal = member.kcalPreference ?? 1800; // fallback
        const groceries = goldReadService.getGroceries(year, week, kcal, basePersons);
        const account = userAccountService.findById(member.userId);
        memberBreakdown.push({
          userId: member.userId,
          displayName: account?.username ?? member.userId,
          kcal,
          itemCount: groceries?.groceries.length ?? 0,
        });
        if (!groceries) continue;
        for (const item of groceries.groceries) {
          const existing = merged.get(item.canonicalName);
          if (existing) {
            existing.totalAmount += item.totalAmount ?? 0;
            existing.requiresReview = existing.requiresReview || item.requiresReview;
            if (!existing.unit && item.unit) existing.unit = item.unit;
          } else {
            merged.set(item.canonicalName, {
              totalAmount: item.totalAmount ?? 0,
              unit: item.unit,
              requiresReview: item.requiresReview,
            });
          }
        }
      }

      const aggregatedGroceries = Array.from(merged.entries()).map(([canonicalName, data]) => ({
        canonicalName,
        totalAmount: Math.round((data.totalAmount + Number.EPSILON) * 1000) / 1000,
        unit: data.unit,
        requiresReview: data.requiresReview,
      })).sort((a, b) => a.canonicalName.localeCompare(b.canonicalName, "nl"));

      json(res, 200, {
        ok: true,
        data: {
          householdId: household.householdId,
          year,
          week,
          basePersons,
          memberCount: household.members.length,
          memberBreakdown,
          groceries: aggregatedGroceries,
        },
      });
      return;
    }

    if (path === "/api/v3/household/bootstrap" && method === "POST") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, {
          ok: false,
          error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." },
        });
        return;
      }
      json(res, 200, handleHouseholdBootstrap(householdService, userAuth.data));
      return;
    }

    if (path === "/api/v3/household/me" && method === "GET") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, {
          ok: false,
          error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." },
        });
        return;
      }
      const statusResult = handleHouseholdStatus(householdService, userAuth.data);
      // Verrijk members met displayName vanuit UserAccountService
      if (statusResult.ok && statusResult.data?.household) {
        const enrichedMembers = statusResult.data.household.members.map((m) => {
          const account = userAccountService.findById(m.userId);
          return { ...m, displayName: account?.username ?? m.userId };
        });
        statusResult.data.household = { ...statusResult.data.household, members: enrichedMembers };
      }
      json(res, 200, statusResult);
      return;
    }

    if (path === "/api/v3/household/invite" && method === "POST") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, {
          ok: false,
          error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." },
        });
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json(res, 200, handleHouseholdInvite(householdService, userAuth.data, body as any));
      return;
    }

    if (path === "/api/v3/household/accept" && method === "POST") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, {
          ok: false,
          error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." },
        });
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json(res, 200, handleHouseholdAccept(householdService, userAuth.data, body as any));
      return;
    }

    if (path === "/api/v3/household/revoke" && method === "POST") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, {
          ok: false,
          error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." },
        });
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json(res, 200, handleHouseholdRevoke(householdService, userAuth.data, body as any));
      return;
    }

    if (path === "/api/v3/household/invitations" && method === "GET") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, {
          ok: false,
          error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." },
        });
        return;
      }
      const householdId = queryParam(req, "householdId") ?? "";
      json(res, 200, handleHouseholdInvitations(householdService, userAuth.data, { householdId }));
      return;
    }

    if (path === "/api/v3/push/register" && method === "POST") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, {
          ok: false,
          error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." },
        });
        return;
      }
      const { token } = body as { token?: string };
      if (!token || typeof token !== "string") {
        json(res, 400, { ok: false, error: { code: "INVALID_BODY", message: "token is verplicht." } });
        return;
      }
      try {
        pushService.registerToken(userAuth.data.subjectId, token);
        json(res, 200, { ok: true });
      } catch (err) {
        const code = err instanceof PushNotificationServiceError ? err.code : "REGISTER_FAILED";
        const message = err instanceof Error ? err.message : "Registratie mislukt.";
        json(res, 400, { ok: false, error: { code, message } });
      }
      return;
    }

    // ---- Eetmeter routes (gebruikers én admins) ----

    if (path === "/api/v3/eetmeter/credentials" && method === "POST") {
      const anyAuth = await getAnySession(req);
      if (!anyAuth.ok || !anyAuth.data) {
        json(res, 401, { ok: false, error: anyAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." } });
        return;
      }
      const { email, password } = body as { email?: string; password?: string };
      if (!email?.trim() || !password) {
        json(res, 400, { ok: false, error: { code: "INVALID_BODY", message: "email en password zijn vereist." } });
        return;
      }
      try {
        const client = getEetmeterClientForUser(anyAuth.data.subjectId);
        await client.login(email.trim(), password);
        json(res, 200, { ok: true, data: { isIngelogd: true } });
      } catch (err) {
        if (err instanceof EetmeterClientError) {
          json(res, 200, { ok: false, error: { code: err.code, message: err.message } });
        } else {
          json(res, 500, { ok: false, error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "Onverwachte fout bij Eetmeter login." } });
        }
      }
      return;
    }

    if (path === "/api/v3/push/unregister" && method === "POST") {
      const userAuth = await getAnySession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, {
          ok: false,
          error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." },
        });
        return;
      }
      const { token } = body as { token?: string };
      if (!token || typeof token !== "string") {
        json(res, 400, { ok: false, error: { code: "INVALID_BODY", message: "token is verplicht." } });
        return;
      }
      pushService.unregisterToken(userAuth.data.subjectId, token);
      json(res, 200, { ok: true });
      return;
    }

    if (path === "/api/v3/eetmeter/dag" && method === "GET") {
      const anyAuth = await getAnySession(req);
      if (!anyAuth.ok || !anyAuth.data) {
        json(res, 401, { ok: false, error: anyAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." } });
        return;
      }
      const datumParam = queryParam(req, "datum");
      let eetmeterDatum: string;
      if (datumParam && /^\d{4}-\d{2}-\d{2}$/.test(datumParam)) {
        eetmeterDatum = datumParam.replace(/-/g, "");
      } else {
        eetmeterDatum = toEetmeterDatum(new Date());
      }
      const client = getEetmeterClientForUser(anyAuth.data.subjectId);
      if (!client.isLoggedIn) {
        json(res, 200, {
          ok: true,
          data: { isIngelogd: false, datum: `${eetmeterDatum.slice(0, 4)}-${eetmeterDatum.slice(4, 6)}-${eetmeterDatum.slice(6, 8)}` },
        });
        return;
      }
      try {
        const dag = await client.fetchDag(eetmeterDatum);
        json(res, 200, { ok: true, data: { isIngelogd: true, datum: dag.datum, dag } });
      } catch (err) {
        if (err instanceof EetmeterClientError) {
          json(res, 200, { ok: false, error: { code: err.code, message: err.message } });
        } else {
          json(res, 500, { ok: false, error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "Onverwachte fout bij ophalen Eetmeter dag." } });
        }
      }
      return;
    }

    // All remaining routes require admin auth
    const authResult = await getAdminSession(req);
    if (!authResult.ok || !authResult.data) {
      json(res, 401, {
        ok: false,
        error: authResult.error ?? { code: "UNAUTHORIZED", message: "Auth required." },
      });
      return;
    }
    const session = authResult.data;

    // ---- System routes ----
    if (path === "/api/v3/system/diagnostics" && method === "GET") {
      json(res, 200, handleSystemDiagnostics(systemOps));
      return;
    }
    if (path === "/api/v3/system/jobs" && method === "GET") {
      json(res, 200, handleSystemJobs(systemOps));
      return;
    }

    // ---- Admin operations ----
    if (path === "/api/v3/admin/ingest" && method === "POST") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = handleAdminIngest(adminOps, session, body as any);
      if (!result.ok) {
        json(res, 200, result);
        return;
      }

      const ingestBody = body as { weeks?: number[]; basePersons?: number[] };
      const ingestWeeks = Array.isArray(ingestBody.weeks) ? ingestBody.weeks : [];
      const ingestBasePersons = Array.isArray(ingestBody.basePersons) ? ingestBody.basePersons : [2];

      // Maak een job-tracking entry aan en start de ingest op de achtergrond
      const jobId = `ingest-${Date.now()}`;
      activeIngestJobs.set(jobId, {
        jobId,
        status: "running",
        phase: "fetching",
        fetched: 0,
        totalFetches: 0,
        processed: 0,
        totalProcessing: 0,
        errors: [],
        startedAt: new Date().toISOString(),
      });

      // Start op achtergrond — niet awaiten zodat de HTTP-response direct terugkomt
      void runRealIngest(ingestWeeks, ingestBasePersons, jobId);

      json(res, 200, {
        ...result,
        data: { ...result.data, jobId },
      });
      return;
    }

    // ---- Ingest job status (polling endpoint) ----
    if (path.startsWith("/api/v3/admin/ingest-status/") && method === "GET") {
      const jobId = path.slice("/api/v3/admin/ingest-status/".length);
      const job = activeIngestJobs.get(jobId);
      if (!job) {
        json(res, 404, { ok: false, error: { code: "NOT_FOUND", message: "Job niet gevonden" } });
        return;
      }
      json(res, 200, { ok: true, data: job });
      return;
    }

    if (path === "/api/v3/admin/recompute" && method === "POST") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json(res, 200, handleAdminRecompute(adminOps, session, body as any));
      return;
    }

    // ---- PG login (haalt automatisch cookie op en zet PG_EXTRA_HEADERS_JSON) ----
    if (path === "/api/v3/admin/pg-login" && method === "POST") {
      const loginBody = body as { email?: string; password?: string; operationId?: string };
      if (!loginBody.email?.trim() || !loginBody.password) {
        json(res, 400, {
          ok: false,
          error: { code: "INVALID_BODY", message: "email en password zijn vereist." },
        });
        return;
      }

      try {
        const loginUrl = config.get<string>("PG_LOGIN_URL");
        const loginResult = await loginToPg(
          { email: loginBody.email, password: loginBody.password },
          loginUrl,
        );

        // Sla de cookies op in de live runtime config
        config.set("PG_EXTRA_HEADERS_JSON", loginResult.extraHeaders);

        // Registreer ook als admin config voor audit trail
        adminOps.updateConfig({
          operationId: loginBody.operationId ?? `pg-login-${Date.now()}`,
          performedBy: session.subjectId,
          key: "PG_EXTRA_HEADERS_JSON",
          value: loginResult.extraHeaders,
        });

        json(res, 200, {
          ok: true,
          data: {
            message: "Succesvol ingelogd bij Project Gezond.",
            cookieNames: loginResult.cookieNames,
            statusCode: loginResult.statusCode,
          },
        });
      } catch (err) {
        if (err instanceof PgLoginError) {
          json(res, 200, {
            ok: false,
            error: { code: err.code, message: err.message },
          });
        } else {
          json(res, 500, {
            ok: false,
            error: {
              code: "INTERNAL_ERROR",
              message: err instanceof Error ? err.message : "Onverwachte fout bij PG login.",
            },
          });
        }
      }
      return;
    }

    // ---- PG discover (zoekt welke weeknummers beschikbaar zijn in de PG API) ----
    if (path === "/api/v3/admin/pg-discover" && method === "POST") {
      try {
        const discoverBody = body as { year?: number };
        const discoverOptions = typeof discoverBody.year === "number" ? { year: discoverBody.year } : {};
        const result = await discoverAvailableWeeks(config, discoverOptions);
        json(res, 200, {
          ok: true,
          data: {
            availableWeeks: result.availableWeeks,
            probedWeeks: result.probedWeeks,
            errors: result.errors,
            // Vaste kcal-varianten die de PG API altijd teruggeeft
            defaultKcals: PG_FIXED_KCALS,
            defaultBasePersons: [2],
          },
        });
      } catch (err) {
        json(res, 500, {
          ok: false,
          error: {
            code: "DISCOVER_ERROR",
            message: err instanceof Error ? err.message : "Fout bij ontdekken van beschikbare weken.",
          },
        });
      }
      return;
    }

    // ---- Tijdelijk: PG recipe raw fetch (om API-structuur te ontdekken) ----
    if (path === "/api/v3/admin/pg-fetch-recipe" && method === "POST") {
      try {
        const { recipeId } = body as { recipeId?: string };
        if (!recipeId) { json(res, 400, { ok: false, error: { code: "MISSING_PARAM", message: "recipeId required" } }); return; }
        const recipeUrl = buildPgEndpointUrl(config, "recipe", { recipeId });
        const recipeData = await fetchPgJson({ requestUrl: recipeUrl, entityType: "pg.recipe", variables: { recipeId } }, config);
        json(res, 200, { ok: true, data: recipeData });
      } catch (err) {
        json(res, 500, { ok: false, error: { code: "PG_FETCH_ERROR", message: err instanceof Error ? err.message : String(err) } });
      }
      return;
    }

    // ---- Admin ingest recipes (haalt volledige receptdetails op via actuele PG recipe API) ----
    if (path === "/api/v3/admin/ingest-recipe-steps" && method === "POST") {
      try {
        const allModels = goldReadService.listAllModels();
        const result = await importNormalizedRecipesForModels(allModels);

        json(res, 200, {
          ok: true,
          data: {
            totalRecipes: result.totalRecipes,
            fetched: result.fetched,
            imported: result.imported,
            errors: result.errors.slice(0, 20),
          },
        });
      } catch (err) {
        json(res, 500, { ok: false, error: { code: "INGEST_STEPS_ERROR", message: err instanceof Error ? err.message : String(err) } });
      }
      return;
    }

    // ---- Admin ingest recipe data from PG API (backwards-compatible route name) ----
    if (path === "/api/v3/admin/ingest-recipe-web" && method === "POST") {
      try {
        const allModels = goldReadService.listAllModels();
        const result = await importNormalizedRecipesForModels(allModels);

        json(res, 200, {
          ok: true,
          data: {
            totalRecipes: result.totalRecipes,
            fetched: result.fetched,
            imported: result.imported,
            errors: result.errors.slice(0, 20),
          },
        });
      } catch (err) {
        json(res, 500, {
          ok: false,
          error: { code: "INGEST_WEB_ERROR", message: err instanceof Error ? err.message : String(err) },
        });
      }
      return;
    }

    // ---- Admin reprocess-from-bronze (herbouwt silver+gold vanuit bestaande bronzebestanden) ----
    if (path === "/api/v3/admin/reprocess-from-bronze" && method === "POST") {
      const bronzeDir = join(ROOT, "out", "v3", "bronze", "pg", "pg.week_menu");

      // Recursief alle JSON-bestanden ophalen zonder /k= in het pad (= ruwe PG-responses)
      const rawFiles: string[] = [];
      const collectJsonFiles = (dir: string): void => {
        let entries;
        try {
          entries = readdirSync(dir, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          if (entry.isDirectory()) {
            collectJsonFiles(fullPath);
          } else if (entry.name.endsWith(".json") && !fullPath.includes("/k=")) {
            rawFiles.push(fullPath);
          }
        }
      };
      collectJsonFiles(bronzeDir);

      if (rawFiles.length === 0) {
        json(res, 200, {
          ok: false,
          error: { code: "NO_BRONZE_FILES", message: "Geen bronzebestanden gevonden zonder k= in pad." },
        });
        return;
      }

      // Verzamel alle silver outputs + gold-modellen zonder tussentijdse state-writes
      const allSilverUpdates: { key: string; output: SilverTransformOutput }[] = [];
      const allGoldModels: GoldReadModel[] = [];
      let processed = 0;
      let totalMeals = 0;
      const errors: string[] = [];

      for (const filePath of rawFiles) {
        let fileData: Record<string, unknown>;
        try {
          fileData = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
        } catch {
          errors.push(`Leesfout: ${filePath}`);
          continue;
        }

        const meta = fileData["metadata"] as Record<string, unknown> | undefined;
        const filePayload = fileData["payload"] as Record<string, unknown> | undefined;
        if (!meta || !filePayload) {
          errors.push(`Ongeldige bronzestructuur: ${filePath}`);
          continue;
        }

        const weekRaw = typeof meta["week"] === "number" ? meta["week"] : 0;
        const basePersons = typeof meta["basePersons"] === "number" ? meta["basePersons"] : 2;
        const sourceObjectId =
          ((meta["requestMeta"] as Record<string, unknown> | undefined)?.["requestUrl"] as string | undefined) ??
          filePath;
        const weekNum = weekRaw % 100;
        const weekYear = Math.floor(weekRaw / 100);
        const pgData = filePayload["data"] as Record<string, unknown>;

        for (const kcal of PG_FIXED_KCALS) {
          try {
            const silverPayload = mapPgWeekDataToSilverPayload(pgData, kcal);
            const [silverOutput] = reprocessSilverTransforms(
              [{ sourceObjectId, payload: silverPayload, year: weekYear, week: weekNum, kcal, basePersons }],
              {
                transformVersion: TRANSFORM_VERSION,
                canonicalRulesetVersion: CANONICAL_RULESET_VERSION,
                synonymDictVersion: SYNONYM_DICT_VERSION,
                // Geen stateStore — batch-write achteraf
              },
            );
            const silverKey = `${weekYear}:${weekNum}:${kcal}:${basePersons}:${TRANSFORM_VERSION}`;
            allSilverUpdates.push({ key: silverKey, output: silverOutput });

            const gold = projectSilverToGold({
              silver: silverOutput,
              context: {
                sourceObjectId,
                year: weekYear,
                week: weekNum,
                kcal,
                basePersons,
                transformVersion: TRANSFORM_VERSION,
                canonicalRulesetVersion: CANONICAL_RULESET_VERSION,
                synonymDictVersion: SYNONYM_DICT_VERSION,
              },
            });
            allGoldModels.push(gold);
            totalMeals += gold.meals.length;
            processed++;
          } catch (err) {
            errors.push(
              `week=${weekYear}W${String(weekNum).padStart(2, "0")} kcal=${kcal}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }

      // Één stateStore-update voor alle silver transforms
      stateStore.update((draft) => {
        for (const { key, output } of allSilverUpdates) {
          draft.silverTransforms[key] = structuredClone(output);
        }
      });

      // Batch-update voor gold (in-memory + één persist-write)
      goldReadService.batchLoad(allGoldModels);
      goldReadService.batchPersist();

      json(res, 200, {
        ok: true,
        data: { filesScanned: rawFiles.length, processed, totalMeals, errors },
      });
      return;
    }

    // ---- Admin: gebruiker admin-rol toekennen ----
    if (path === "/api/v3/admin/users/set-role" && method === "POST") {
      const { username, adminRole } = body as { username?: string; adminRole?: string | null };
      if (!username) {
        json(res, 400, { ok: false, error: { code: "INVALID_BODY", message: "username is verplicht." } });
        return;
      }
      if (adminRole !== undefined && adminRole !== null && adminRole !== "owner" && adminRole !== "operator") {
        json(res, 400, { ok: false, error: { code: "INVALID_ROLE", message: "adminRole moet 'owner', 'operator' of null zijn." } });
        return;
      }
      try {
        const account = userAccountService.findByUsername(username);
        if (!account) {
          json(res, 404, { ok: false, error: { code: "USER_NOT_FOUND", message: "Gebruiker niet gevonden." } });
          return;
        }
        userAccountService.setAdminRole(account.userId, (adminRole as "owner" | "operator" | null) ?? null);
        json(res, 200, { ok: true, data: { userId: account.userId, username: account.username, adminRole: adminRole ?? null } });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Rol instellen mislukt.";
        json(res, 500, { ok: false, error: { code: "SET_ROLE_FAILED", message } });
      }
      return;
    }

    if (path === "/api/v3/admin/config" && method === "POST") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = handleAdminConfigUpdate(adminOps, session, body as any);
      if (result.ok) {
        // Also update the live runtime config so PG headers etc. take effect immediately
        const configBody = body as { key?: string; value?: unknown };
        if (typeof configBody.key === "string" && configBody.key) {
          try {
            config.set(configBody.key, configBody.value);
          } catch {
            // Key not in runtime config definitions — ignore
          }
        }
      }
      json(res, 200, result);
      return;
    }

    if (path === "/api/v3/admin/cleanup" && method === "POST") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json(res, 200, handleAdminCleanup(adminOps, session, body as any));
      return;
    }

    // ---- Admin data: recipes ----
    if (path === "/api/v3/admin/data/recipes" && method === "GET") {
      json(res, 200, handleListRecipes(adminData, session));
      return;
    }
    if (path === "/api/v3/admin/data/recipes/upsert" && method === "POST") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json(res, 200, handleUpsertRecipe(adminData, session, body as any));
      return;
    }
    if (path === "/api/v3/admin/data/recipes/delete" && method === "POST") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json(res, 200, handleDeleteRecipe(adminData, session, body as any));
      return;
    }

    // ---- Admin data: week menus ----
    if (path === "/api/v3/admin/data/week-menus" && method === "GET") {
      json(res, 200, handleListWeekMenus(adminData, session));
      return;
    }
    if (path === "/api/v3/admin/data/week-menus/upsert" && method === "POST") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json(res, 200, handleUpsertWeekMenu(adminData, session, body as any));
      return;
    }
    if (path === "/api/v3/admin/data/week-menus/delete" && method === "POST") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json(res, 200, handleDeleteWeekMenu(adminData, session, body as any));
      return;
    }

    // ---- Admin data: mapping overrides ----
    if (path === "/api/v3/admin/data/mapping-overrides" && method === "GET") {
      json(res, 200, handleListMappingOverrides(adminData, session));
      return;
    }
    if (path === "/api/v3/admin/data/mapping-overrides/upsert" && method === "POST") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json(res, 200, handleUpsertMappingOverride(adminData, session, body as any));
      return;
    }
    if (path === "/api/v3/admin/data/mapping-overrides/delete" && method === "POST") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json(res, 200, handleDeleteMappingOverride(adminData, session, body as any));
      return;
    }

    // ---- Gold weekplannen (ingested data) ----
    if (path === "/api/v3/admin/data/gold-week-plans" && method === "GET") {
      json(res, 200, { ok: true, data: goldReadService.listWeekPlans() });
      return;
    }

    // ---- Admin households (stub — WI-260 implementeert volledige versie) ----
    if (path === "/api/v3/admin/households/status" && method === "GET") {
      json(res, 200, { ok: true, data: [] });
      return;
    }
    if (path === "/api/v3/admin/households/invitations" && method === "GET") {
      json(res, 200, { ok: true, data: [] });
      return;
    }
    if (path === "/api/v3/admin/households/invite-resend" && method === "POST") {
      json(res, 200, {
        ok: false,
        error: { code: "NOT_IMPLEMENTED", message: "WI-260 implementeert deze route." },
      });
      return;
    }
    if (path === "/api/v3/admin/households/session-reset" && method === "POST") {
      json(res, 200, {
        ok: false,
        error: { code: "NOT_IMPLEMENTED", message: "WI-260 implementeert deze route." },
      });
      return;
    }
    if (path === "/api/v3/admin/households/session-diagnose" && method === "GET") {
      const subjectId = queryParam(req, "subjectId") ?? "";
      json(res, 200, {
        ok: true,
        data: {
          subjectId,
          householdId: "unknown",
          hasActiveSession: false,
          lastValidatedAt: new Date().toISOString(),
        },
      });
      return;
    }

    // ---- Eetmeter admin routes (werken via per-gebruiker client, ook via admin sessie) ----
    if (path === "/api/v3/admin/eetmeter/credentials" && method === "POST") {
      const { email, password } = body as { email?: string; password?: string };
      if (!email?.trim() || !password) {
        json(res, 400, { ok: false, error: { code: "INVALID_BODY", message: "email en password zijn vereist." } });
        return;
      }
      try {
        const client = getEetmeterClientForUser(session.subjectId);
        await client.login(email.trim(), password);
        json(res, 200, { ok: true, data: { isIngelogd: true } });
      } catch (err) {
        if (err instanceof EetmeterClientError) {
          json(res, 200, { ok: false, error: { code: err.code, message: err.message } });
        } else {
          json(res, 500, { ok: false, error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "Onverwachte fout bij Eetmeter login." } });
        }
      }
      return;
    }

    if (path === "/api/v3/admin/eetmeter/dag" && method === "GET") {
      const datumParam = queryParam(req, "datum");
      let eetmeterDatum: string;
      if (datumParam && /^\d{4}-\d{2}-\d{2}$/.test(datumParam)) {
        eetmeterDatum = datumParam.replace(/-/g, "");
      } else {
        eetmeterDatum = toEetmeterDatum(new Date());
      }
      const client = getEetmeterClientForUser(session.subjectId);
      if (!client.isLoggedIn) {
        json(res, 200, {
          ok: true,
          data: { isIngelogd: false, datum: `${eetmeterDatum.slice(0, 4)}-${eetmeterDatum.slice(4, 6)}-${eetmeterDatum.slice(6, 8)}` },
        });
        return;
      }
      try {
        const dag = await client.fetchDag(eetmeterDatum);
        json(res, 200, { ok: true, data: { isIngelogd: true, datum: dag.datum, dag } });
      } catch (err) {
        if (err instanceof EetmeterClientError) {
          json(res, 200, { ok: false, error: { code: err.code, message: err.message } });
        } else {
          json(res, 500, { ok: false, error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "Onverwachte fout bij ophalen Eetmeter dag." } });
        }
      }
      return;
    }

    notFound(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    json(res, 500, { ok: false, error: { code: "INTERNAL_ERROR", message } });
  }
}

// ---- Main ------------------------------------------------------------------

const { adminToken, userToken } = await bootstrapDevTokens();

const server = createServer((req, res) => {
  void handleRequest(req, res);
});

server.listen(PORT, () => {
  const expiresAt = new Date(
    (Math.floor(Date.now() / 1000) + DEV_TOKEN_TTL) * 1000,
  ).toLocaleDateString("nl-NL");

  console.log("");
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║           MenuFit Admin Backend — dev server                  ║");
  console.log("╠════════════════════════════════════════════════════════════════╣");
  console.log(`║  Luistert op  http://localhost:${PORT}                            ║`);
  console.log("║                                                                ║");
  console.log(`║  Tokens geldig tot: ${expiresAt.padEnd(43)}║`);
  console.log("║                                                                ║");
  console.log("║  DEV ADMIN TOKEN:                                             ║");
  console.log(`║  ${adminToken.slice(0, 60)}  ║`);
  if (adminToken.length > 60) {
    console.log(`║  ${adminToken.slice(60).padEnd(60, " ")}  ║`);
  }
  console.log("║                                                                ║");
  console.log("║  DEV USER TOKEN (voor iOS app):                               ║");
  console.log(`║  ${userToken.slice(0, 60)}  ║`);
  if (userToken.length > 60) {
    console.log(`║  ${userToken.slice(60).padEnd(60, " ")}  ║`);
  }
  console.log("║                                                                ║");
  console.log("║  Opgeslagen in:                                               ║");
  console.log("║    out/dev-admin-token.txt                                    ║");
  console.log("║    out/dev-user-token.txt                                     ║");
  console.log("║                                                                ║");
  console.log("║  Admin UI:  http://localhost:5173  (na npm run dev in app/)   ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("  Gebruik in admin UI:");
  console.log(`  - Backend URL:  http://localhost:${PORT}`);
  console.log(`  - Operator ID:  ${DEV_OPERATOR_ID}`);
  console.log(`  - Admin Token:  (zie boven of out/dev-admin-token.txt)`);
  console.log("");
  console.log("  Gebruik in iOS app (Info.plist):");
  console.log(`  - MenuFitBackendBaseURL:  http://localhost:${PORT}`);
  console.log(`  - MenuFitUserAccessToken: (zie boven of out/dev-user-token.txt)`);
  console.log(`  - MenuFitUserSubjectId:   ${DEV_USER_ID}`);
  console.log("");
  console.log(
    "  PG inloggen (vereist voor ingest):",
  );
  console.log(
    "    node --experimental-strip-types scripts/pg-login.ts <email> <password>",
  );
  console.log("");
});
