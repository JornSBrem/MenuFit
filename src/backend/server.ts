/**
 * MenuFit Backend HTTP Server
 *
 * Start:  node --experimental-strip-types src/backend/server.ts
 *
 * Op opstarten wordt een dev admin token geprint naar de console en
 * geschreven naar out/dev-admin-token.txt.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { AuditTrailService } from "./application/audit/audit-trail-service.ts";
import { AdminOperationsService } from "./application/admin/admin-operations-service.ts";
import { AdminDataService } from "./application/admin/admin-data-service.ts";
import { SystemOperationsService } from "./application/system/system-operations-service.ts";
import { SessionLifecycleService } from "./application/auth/session-lifecycle-service.ts";
import { PersistentStateStore } from "./integrations/storage/persistent-state-store.ts";
import { authorizeAdminFromBearerHeader } from "./interfaces/http/auth/session-middleware.ts";
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

// ---- Config ----------------------------------------------------------------

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const PORT = Number(process.env["APP_PORT"] ?? 3000);
const STATE_PATH = process.env["STATE_STORE_PATH"] ?? join(ROOT, "out", "v3", "state", "server-state.json");
const TOKEN_PATH = join(ROOT, "out", "dev-admin-token.txt");
const DEV_OPERATOR_ID = process.env["DEV_OPERATOR_ID"] ?? "dev-admin";
const DEV_TOKEN_TTL = 24 * 60 * 60; // 24 hours

// ---- Services --------------------------------------------------------------

const stateStore = new PersistentStateStore(STATE_PATH);
const auditTrail = new AuditTrailService();
const lifecycle = new SessionLifecycleService({ stateStore, adminTtlSeconds: DEV_TOKEN_TTL });
const adminOps = new AdminOperationsService({ auditTrail });
const adminData = new AdminDataService({ auditTrail });
const systemOps = new SystemOperationsService({ auditTrail });

// ---- Dev admin token -------------------------------------------------------

async function bootstrapDevToken(): Promise<string> {
  const { token } = lifecycle.issueAdminSession({
    subjectId: DEV_OPERATOR_ID,
    adminRole: "owner",
    ttlSeconds: DEV_TOKEN_TTL,
  });

  await mkdir(join(ROOT, "out"), { recursive: true });
  await writeFile(TOKEN_PATH, token, "utf8");

  return token;
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

function getSession(req: IncomingMessage) {
  return authorizeAdminFromBearerHeader(lifecycle, getAuthHeader(req));
}

function queryParam(req: IncomingMessage, name: string): string | undefined {
  const url = new URL(req.url ?? "/", "http://localhost");
  return url.searchParams.get(name) ?? undefined;
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

  // All other routes require auth
  const authResult = getSession(req);
  if (!authResult.ok || !authResult.data) {
    json(res, 401, {
      ok: false,
      error: authResult.error ?? { code: "UNAUTHORIZED", message: "Auth required." },
    });
    return;
  }
  const session = authResult.data;

  try {
    const body = method === "POST" ? await readBody(req) : {};

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
      json(res, 200, handleAdminIngest(adminOps, session, body as any));
      return;
    }
    if (path === "/api/v3/admin/recompute" && method === "POST") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json(res, 200, handleAdminRecompute(adminOps, session, body as any));
      return;
    }
    if (path === "/api/v3/admin/config" && method === "POST") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json(res, 200, handleAdminConfigUpdate(adminOps, session, body as any));
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
      json(res, 200, { ok: false, error: { code: "NOT_IMPLEMENTED", message: "WI-260 implementeert deze route." } });
      return;
    }
    if (path === "/api/v3/admin/households/session-reset" && method === "POST") {
      json(res, 200, { ok: false, error: { code: "NOT_IMPLEMENTED", message: "WI-260 implementeert deze route." } });
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

const token = await bootstrapDevToken();

const server = createServer((req, res) => {
  void handleRequest(req, res);
});

server.listen(PORT, () => {
  console.log("");
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║           MenuFit Admin Backend — dev server                  ║");
  console.log("╠════════════════════════════════════════════════════════════════╣");
  console.log(`║  Luistert op  http://localhost:${PORT}                            ║`);
  console.log("║                                                                ║");
  console.log("║  DEV ADMIN TOKEN (24 uur geldig):                             ║");
  console.log(`║  ${token.slice(0, 60)}  ║`);
  if (token.length > 60) {
    console.log(`║  ${token.slice(60).padEnd(60, " ")}  ║`);
  }
  console.log("║                                                                ║");
  console.log(`║  Opgeslagen in: out/dev-admin-token.txt                       ║`);
  console.log("║                                                                ║");
  console.log("║  Admin UI:  http://localhost:5173  (na npm run dev in app/)   ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  Gebruik in admin UI:`);
  console.log(`  - Backend URL:  http://localhost:${PORT}`);
  console.log(`  - Operator ID:  ${DEV_OPERATOR_ID}`);
  console.log(`  - Token:        (zie boven of out/dev-admin-token.txt)`);
  console.log("");
});
