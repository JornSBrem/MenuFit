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
import { HouseholdService, HouseholdServiceError } from "./application/household/household-service.ts";
import { GoldWeekReadService, projectSilverToGold } from "./application/gold/index.ts";
import type { GoldMealIngredient, GoldReadModel, GoldRecipeStep } from "./application/gold/index.ts";

/** Interne type alias voor stap-verrijking */
type GoldRecipeStepData = GoldRecipeStep;

/**
 * Extraheer bereidingsstappen uit een PG recipe API response.
 * Probeert meerdere veldnamen / HTML-formaten.
 */
const extractRecipeSteps = (raw: unknown): GoldRecipeStepData[] => {
  if (typeof raw !== "object" || raw === null) return [];
  const data = (raw as Record<string, unknown>).data ?? raw;
  if (typeof data !== "object" || data === null) return [];
  const d = data as Record<string, unknown>;

  // Strip HTML en lege regels
  const stripHtml = (html: string): string =>
    html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

  // Hulp: zet HTML-blokken (<p>, <li>) om naar tekst-array
  const htmlToLines = (html: string): string[] =>
    html.split(/<\/(?:p|li)>/i)
      .map((b) => stripHtml(b))
      .filter((t) => t.length > 4);

  const toSteps = (lines: string[]): GoldRecipeStepData[] =>
    lines.map((text, i) => ({ step: i + 1, text }));

  // 1. instructions als array van objecten
  if (Array.isArray(d.instructions)) {
    const lines = d.instructions
      .map((s: unknown) => {
        if (typeof s === "string") return stripHtml(s);
        if (typeof s === "object" && s !== null) {
          const obj = s as Record<string, unknown>;
          return stripHtml(String(obj.description ?? obj.text ?? obj.step_text ?? ""));
        }
        return "";
      })
      .filter((t) => t.length > 4);
    if (lines.length > 0) return toSteps(lines);
  }

  // 2. preparation / content / description / method als HTML-string
  for (const field of ["preparation", "preparation_text", "content", "description", "method", "directions"]) {
    const val = d[field];
    if (typeof val === "string" && val.length > 20) {
      const lines = htmlToLines(val);
      if (lines.length > 0) return toSteps(lines);
    }
  }

  return [];
};
import { reprocessSilverTransforms } from "./application/silver/index.ts";
import type { SilverTransformOutput } from "./application/silver/index.ts";
import { createIngestPlan } from "./application/ingest/ingest-planner.ts";
import { runBronzeIngestTasks, type FetchJson } from "./application/ingest/bronze-runner.ts";
import { mapPgWeekDataToSilverPayload } from "./application/ingest/pg-payload-mapper.ts";
import { fetchPgJson, PgRateLimitError } from "./integrations/pg/pg-fetch.ts";
import { buildPgEndpointUrl } from "./integrations/pg/endpoint-contract.ts";
import { loginToPg, PgLoginError } from "./integrations/pg/pg-login.ts";
import { discoverAvailableWeeks } from "./integrations/pg/pg-discover.ts";
import { PersistentStateStore } from "./integrations/storage/persistent-state-store.ts";
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

// ---- Services --------------------------------------------------------------

const stateStore = new PersistentStateStore(STATE_PATH);
const auditTrail = new AuditTrailService();
const lifecycle = new SessionLifecycleService({ stateStore, adminTtlSeconds: DEV_TOKEN_TTL });
const userAccountService = new UserAccountService({ stateStore, lifecycle, tokenTtlSeconds: DEV_TOKEN_TTL });
const adminOps = new AdminOperationsService({ auditTrail });
const adminData = new AdminDataService({ auditTrail });
const systemOps = new SystemOperationsService({ auditTrail });
const householdService = new HouseholdService({ stateStore });
const goldReadService = new GoldWeekReadService({ stateStore });

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

// ---- Real ingest pipeline --------------------------------------------------

const TRANSFORM_VERSION = "1.0.0";
const CANONICAL_RULESET_VERSION = "1.0.0";
const SYNONYM_DICT_VERSION = "1.0.0";

/** Wacht ms milliseconden (voor throttling tussen PG API requests) */
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Milliseconden wachten tussen opeenvolgende PG API requests (rate limit) */
const PG_FETCH_DELAY_MS = 4000;

/** Vaste kcal-varianten die de PG API altijd teruggeeft in één weekmenu-response */
const PG_FIXED_KCALS = [1250, 1500, 1800, 2100];

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
              stateStore,
            },
          );

          for (const silver of silverOutputs) {
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
            goldReadService.upsert(gold);
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

function getAdminSession(req: IncomingMessage) {
  return authorizeAdminFromBearerHeader(lifecycle, getAuthHeader(req));
}

function getUserSession(req: IncomingMessage) {
  return authorizeUserFromBearerHeader(lifecycle, getAuthHeader(req));
}

/** Accepts either a user or admin bearer token (for public-ish data endpoints). */
function getAnySession(req: IncomingMessage) {
  const adminResult = getAdminSession(req);
  if (adminResult.ok) {
    return adminResult;
  }
  return getUserSession(req);
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
      const authResult = getAnySession(req);
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
      const authResult = getAnySession(req);
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
      const authResult = getAnySession(req);
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
      const { username, password } = body as { username?: string; password?: string };
      if (!username || !password) {
        json(res, 400, { ok: false, error: { code: "INVALID_BODY", message: "username en password zijn verplicht." } });
        return;
      }
      try {
        const result = userAccountService.register(username, password);
        json(res, 201, {
          ok: true,
          data: {
            token: result.token,
            userId: result.userId,
            username: result.username,
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
        json(res, 400, { ok: false, error: { code: "INVALID_BODY", message: "username en password zijn verplicht." } });
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

    if (path === "/api/v3/auth/me" && method === "GET") {
      const userAuth = getUserSession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, { ok: false, error: userAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." } });
        return;
      }
      const account = userAccountService.findById(userAuth.data.subjectId);
      json(res, 200, {
        ok: true,
        data: {
          userId: userAuth.data.subjectId,
          username: account?.username ?? userAuth.data.subjectId,
        },
      });
      return;
    }

    // ---- Household routes (user auth) ----
    if (path === "/api/v3/household/create" && method === "POST") {
      const userAuth = getUserSession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, { ok: false, error: userAuth.error ?? { code: "UNAUTHORIZED", message: "User auth required." } });
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
      const userAuth = getUserSession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, { ok: false, error: userAuth.error ?? { code: "UNAUTHORIZED", message: "User auth required." } });
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

    if (path === "/api/v3/household/bootstrap" && method === "POST") {
      const userAuth = getUserSession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, {
          ok: false,
          error: userAuth.error ?? { code: "UNAUTHORIZED", message: "User auth required." },
        });
        return;
      }
      json(res, 200, handleHouseholdBootstrap(householdService, userAuth.data));
      return;
    }

    if (path === "/api/v3/household/me" && method === "GET") {
      const userAuth = getUserSession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, {
          ok: false,
          error: userAuth.error ?? { code: "UNAUTHORIZED", message: "User auth required." },
        });
        return;
      }
      json(res, 200, handleHouseholdStatus(householdService, userAuth.data));
      return;
    }

    if (path === "/api/v3/household/invite" && method === "POST") {
      const userAuth = getUserSession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, {
          ok: false,
          error: userAuth.error ?? { code: "UNAUTHORIZED", message: "User auth required." },
        });
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json(res, 200, handleHouseholdInvite(householdService, userAuth.data, body as any));
      return;
    }

    if (path === "/api/v3/household/accept" && method === "POST") {
      const userAuth = getUserSession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, {
          ok: false,
          error: userAuth.error ?? { code: "UNAUTHORIZED", message: "User auth required." },
        });
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json(res, 200, handleHouseholdAccept(householdService, userAuth.data, body as any));
      return;
    }

    if (path === "/api/v3/household/revoke" && method === "POST") {
      const userAuth = getUserSession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, {
          ok: false,
          error: userAuth.error ?? { code: "UNAUTHORIZED", message: "User auth required." },
        });
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json(res, 200, handleHouseholdRevoke(householdService, userAuth.data, body as any));
      return;
    }

    if (path === "/api/v3/household/invitations" && method === "GET") {
      const userAuth = getUserSession(req);
      if (!userAuth.ok || !userAuth.data) {
        json(res, 401, {
          ok: false,
          error: userAuth.error ?? { code: "UNAUTHORIZED", message: "User auth required." },
        });
        return;
      }
      const householdId = queryParam(req, "householdId") ?? "";
      json(res, 200, handleHouseholdInvitations(householdService, userAuth.data, { householdId }));
      return;
    }

    // All remaining routes require admin auth
    const authResult = getAdminSession(req);
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

    // ---- Admin ingest recipe steps (haalt bereidingsstappen op via PG recipe API) ----
    if (path === "/api/v3/admin/ingest-recipe-steps" && method === "POST") {
      try {
        // Verzamel alle unieke recipe-slugs uit de gold data
        const allModels = goldReadService.listAllModels();
        const slugSet = new Set<string>();
        for (const model of allModels) {
          for (const meal of model.meals) {
            if (meal.recipeId && meal.imageUrl) slugSet.add(meal.recipeId);
          }
        }
        const slugs = Array.from(slugSet);

        // Haal elke recipe op en extraheer stappen
        const stepsMap = new Map<string, GoldRecipeStepData[]>();
        const errors: string[] = [];
        let fetched = 0;

        for (const slug of slugs) {
          try {
            const recipeUrl = buildPgEndpointUrl(config, "recipe", { recipeId: slug });
            const raw = await fetchPgJson({ requestUrl: recipeUrl, entityType: "pg.recipe", variables: { recipeId: slug } }, config);
            const steps = extractRecipeSteps(raw);
            if (steps.length > 0) stepsMap.set(slug, steps);
            fetched++;
          } catch (err) {
            errors.push(`${slug}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        // Verrijk alle gold modellen met de stappen
        goldReadService.enrichWithSteps(stepsMap);

        json(res, 200, {
          ok: true,
          data: {
            totalRecipes: slugs.length,
            fetched,
            withSteps: stepsMap.size,
            errors: errors.slice(0, 20),
          },
        });
      } catch (err) {
        json(res, 500, { ok: false, error: { code: "INGEST_STEPS_ERROR", message: err instanceof Error ? err.message : String(err) } });
      }
      return;
    }

    // ---- Admin ingest recipe data from public website (scrapes www.projectgezond.nl) ----
    if (path === "/api/v3/admin/ingest-recipe-web" && method === "POST") {
      try {
        // Verzamel alle unieke recipe-slugs uit de gold data
        const allModels = goldReadService.listAllModels();
        const slugSet = new Set<string>();
        for (const model of allModels) {
          for (const meal of model.meals) {
            if (meal.recipeId && meal.imageUrl) slugSet.add(meal.recipeId);
          }
        }
        const slugs = Array.from(slugSet);

        const stripHtml = (html: string): string =>
          html
            .replace(/<[^>]+>/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&nbsp;/g, " ")
            .replace(/&apos;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&euml;/g, "ë")
            .replace(/&eacute;/g, "é")
            .replace(/&egrave;/g, "è")
            .replace(/&agrave;/g, "à")
            .replace(/&auml;/g, "ä")
            .replace(/&ouml;/g, "ö")
            .replace(/&uuml;/g, "ü")
            .replace(/\s+/g, " ")
            .trim();

        /**
         * Parseer ingrediënten uit de recipe-pagina HTML.
         * Structuur: <div class="ingredient" itemprop="recipeIngredient">
         *              <dt>300 gr</dt><dd>kruimige aardappels</dd>
         *            </div>
         */
        const parseIngredients = (html: string): GoldMealIngredient[] => {
          const ingredients: GoldMealIngredient[] = [];
          const blockPattern = /<div[^>]*class="[^"]*ingredient[^"]*"[^>]*itemprop="recipeIngredient"[^>]*>([\s\S]*?)<\/div>/gi;
          let blockMatch: RegExpExecArray | null;
          while ((blockMatch = blockPattern.exec(html)) !== null) {
            const block = blockMatch[1] ?? "";
            const dtMatch = /<dt[^>]*>([\s\S]*?)<\/dt>/i.exec(block);
            const ddMatch = /<dd[^>]*>([\s\S]*?)<\/dd>/i.exec(block);
            const amount = dtMatch ? stripHtml(dtMatch[1]) : "";
            const name = ddMatch ? stripHtml(ddMatch[1]) : "";
            const text = [amount, name].filter(Boolean).join(" ").trim();
            if (text) ingredients.push({ text });
          }
          return ingredients;
        };

        /**
         * Parseer bereidingsstappen uit de recipe-pagina HTML.
         * Structuur: <ol class="wp-block-list"><li>Stap 1</li><li>Stap 2</li></ol>
         * binnen een block dat "Instructions" of "bereiding" bevat.
         */
        const parseSteps = (html: string): GoldRecipeStep[] => {
          const steps: GoldRecipeStep[] = [];
          // Zoek de instructie-sectie
          const instrPattern = /Instructions[\s\S]{0,200}?<ol[^>]*class="[^"]*wp-block-list[^"]*"[^>]*>([\s\S]*?)<\/ol>/i;
          const instrMatch = instrPattern.exec(html);
          if (!instrMatch?.[1]) return steps;
          const listHtml = instrMatch[1];
          const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
          let liMatch: RegExpExecArray | null;
          let stepNum = 1;
          while ((liMatch = liPattern.exec(listHtml)) !== null) {
            const text = stripHtml(liMatch[1]).trim();
            if (text) steps.push({ step: stepNum++, text });
          }
          return steps;
        };

        const dataMap = new Map<string, { ingredients?: GoldMealIngredient[]; steps?: GoldRecipeStep[] }>();
        const errors: string[] = [];
        let fetched = 0;
        let withData = 0;

        for (const slug of slugs) {
          try {
            const url = `https://www.projectgezond.nl/recepten/${encodeURIComponent(slug)}`;
            const response = await fetch(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (compatible; MenuFit/1.0)",
                Accept: "text/html",
              },
              redirect: "follow",
            });

            if (!response.ok) {
              errors.push(`${slug}: HTTP ${response.status}`);
              continue;
            }

            const html = await response.text();
            const ingredients = parseIngredients(html);
            const steps = parseSteps(html);

            if (ingredients.length > 0 || steps.length > 0) {
              dataMap.set(slug, { ingredients, steps });
              withData++;
            }
            fetched++;

            // Kleine pauze om de server niet te overbelasten
            await new Promise<void>((resolve) => setTimeout(resolve, 150));
          } catch (err) {
            errors.push(`${slug}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        // Verrijk alle gold modellen
        goldReadService.enrichWithRecipeData(dataMap);

        json(res, 200, {
          ok: true,
          data: {
            totalRecipes: slugs.length,
            fetched,
            withData,
            errors: errors.slice(0, 20),
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
      const adminAuth = authorizeAdminFromBearerHeader(req, lifecycle);
      if (!adminAuth.ok) {
        json(res, 401, { ok: false, error: adminAuth.error ?? { code: "UNAUTHORIZED", message: "Auth required." } });
        return;
      }
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
