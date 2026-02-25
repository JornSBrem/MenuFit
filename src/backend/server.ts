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

// ---- Real ingest pipeline --------------------------------------------------

const TRANSFORM_VERSION = "1.0.0";
const CANONICAL_RULESET_VERSION = "1.0.0";
const SYNONYM_DICT_VERSION = "1.0.0";

async function runRealIngest(
  weeks: number[],
  kcals: number[],
  basePersons: number[],
): Promise<{ tasksRan: number; goldProjected: number; errors: string[] }> {
  const matrix = { weeks, kcals, basePersons };
  const tasks = createIngestPlan(matrix, config);
  const capturedPayloads = new Map<string, unknown>();
  const errors: string[] = [];

  const capturingFetch: FetchJson = async (url, task) => {
    const payload = await fetchPgJson(task, config);
    capturedPayloads.set(
      `${task.week}:${task.kcal}:${task.basePersons}:${task.entityType}`,
      payload,
    );
    return payload;
  };

  await runBronzeIngestTasks(tasks, config, capturingFetch);

  const year = new Date().getUTCFullYear();
  let goldProjected = 0;

  for (const task of tasks) {
    if (task.entityType !== "pg.week_menu") {
      continue;
    }
    const rawPayload = capturedPayloads.get(
      `${task.week}:${task.kcal}:${task.basePersons}:${task.entityType}`,
    );
    if (!rawPayload) {
      errors.push(`Missing captured payload for week=${task.week} kcal=${task.kcal}`);
      continue;
    }

    try {
      // PG response shape: { data: { meals: [...], groceries: [...] } }
      const pgData =
        (rawPayload as Record<string, unknown>)["data"] ??
        rawPayload;

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
        const context = {
          sourceObjectId: task.requestUrl,
          year,
          week: task.week,
          kcal: task.kcal,
          basePersons: task.basePersons,
          transformVersion: TRANSFORM_VERSION,
          canonicalRulesetVersion: CANONICAL_RULESET_VERSION,
          synonymDictVersion: SYNONYM_DICT_VERSION,
        };
        const gold = projectSilverToGold({ silver, context });
        goldReadService.upsert(gold);
        goldProjected += 1;
      }
    } catch (err) {
      errors.push(
        `Silver/Gold pipeline failed for week=${task.week}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { tasksRan: tasks.length, goldProjected, errors };
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

      // Run the real pipeline asynchronously — run and report results
      const ingestBody = body as { weeks?: number[]; kcals?: number[]; basePersons?: number[] };
      const ingestWeeks = Array.isArray(ingestBody.weeks) ? ingestBody.weeks : [];
      const ingestKcals = Array.isArray(ingestBody.kcals) ? ingestBody.kcals : [];
      const ingestBasePersons = Array.isArray(ingestBody.basePersons) ? ingestBody.basePersons : [];

      try {
        const pipelineResult = await runRealIngest(ingestWeeks, ingestKcals, ingestBasePersons);
        json(res, 200, {
          ...result,
          data: {
            ...result.data,
            pipeline: pipelineResult,
          },
        });
      } catch (err) {
        // Return the admin op report but note the pipeline error
        json(res, 200, {
          ...result,
          data: {
            ...result.data,
            pipeline: {
              tasksRan: 0,
              goldProjected: 0,
              errors: [err instanceof Error ? err.message : String(err)],
            },
          },
        });
      }
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
