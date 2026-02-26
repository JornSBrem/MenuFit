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
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createDefaultRuntimeConfig } from "../shared/config/index.ts";
import { AuditTrailService } from "./application/audit/audit-trail-service.ts";
import { AdminOperationsService } from "./application/admin/admin-operations-service.ts";
import { AdminDataService } from "./application/admin/admin-data-service.ts";
import { SystemOperationsService } from "./application/system/system-operations-service.ts";
import { SessionLifecycleService } from "./application/auth/session-lifecycle-service.ts";
import { HouseholdService } from "./application/household/household-service.ts";
import { GoldWeekReadService, projectSilverToGold } from "./application/gold/index.ts";
import { reprocessSilverTransforms } from "./application/silver/index.ts";
import { createIngestPlan } from "./application/ingest/ingest-planner.ts";
import { runBronzeIngestTasks, type FetchJson } from "./application/ingest/bronze-runner.ts";
import { fetchPgJson } from "./integrations/pg/pg-fetch.ts";
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
const PG_FETCH_DELAY_MS = 300;

async function runRealIngest(
  weeks: number[],
  kcals: number[],
  basePersons: number[],
  jobId: string,
): Promise<void> {
  const job = activeIngestJobs.get(jobId);
  if (!job) return;

  try {
    const matrix = { weeks, kcals, basePersons };
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
      try {
        const payload = await fetchPgJson(sampleTask, config);
        urlToPayload.set(url, payload);
      } catch (err) {
        job.errors.push(
          `Ophalen mislukt voor ${url}: ${err instanceof Error ? err.message : String(err)}`,
        );
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

    // --- Stap 3: silver/gold verwerking per week×kcal combinatie ---
    const weekMenuTasks = runnableTasks.filter((t) => t.entityType === "pg.week_menu");
    job.phase = "processing";
    job.totalProcessing = weekMenuTasks.length;
    job.processed = 0;

    const year = new Date().getUTCFullYear();
    let goldProjected = 0;

    for (let i = 0; i < weekMenuTasks.length; i++) {
      const task = weekMenuTasks[i];
      const rawPayload = urlToPayload.get(task.requestUrl);
      if (!rawPayload) {
        job.errors.push(`Geen payload voor week=${task.week} kcal=${task.kcal}`);
        job.processed = i + 1;
        continue;
      }

      try {
        const pgData =
          (rawPayload as Record<string, unknown>)["data"] ?? rawPayload;

        const silverOutputs = reprocessSilverTransforms(
          [
            {
              sourceObjectId: task.requestUrl,
              payload: pgData as Parameters<typeof reprocessSilverTransforms>[0][number]["payload"],
              year,
              week: task.week,
              kcal: task.kcal,
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
              year,
              week: task.week,
              kcal: task.kcal,
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
          `Silver/Gold fout week=${task.week} kcal=${task.kcal}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      job.processed = i + 1;
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

    // ---- Household routes (user auth) ----
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

      const ingestBody = body as { weeks?: number[]; kcals?: number[]; basePersons?: number[] };
      const ingestWeeks = Array.isArray(ingestBody.weeks) ? ingestBody.weeks : [];
      const ingestKcals = Array.isArray(ingestBody.kcals) ? ingestBody.kcals : [];
      const ingestBasePersons = Array.isArray(ingestBody.basePersons) ? ingestBody.basePersons : [];

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
      void runRealIngest(ingestWeeks, ingestKcals, ingestBasePersons, jobId);

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
            // Standaard kcal/basePersons voor "alles inladen"
            // 1250 t/m 3000 in stappen van 250
            defaultKcals: [1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000],
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
