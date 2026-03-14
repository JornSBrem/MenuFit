import assert from "node:assert/strict";
import test from "node:test";

import {
  AdminDashboardController,
  type AdminDashboardApi,
} from "./admin-dashboard-controller.ts";
import type {
  AdminMappingOverrideRecord,
  AdminOperationReport,
  AdminRecipeRecord,
  AdminWeekMenuRecord,
  ApiEnvelope,
  HouseholdInvitationRecord,
  HouseholdOperationsStatus,
  SystemDiagnosticsSummary,
  SystemJobRecord,
  UserSessionDiagnostic,
} from "./types.ts";

const createReport = (
  operationId: string,
  operationType: AdminOperationReport["operationType"],
): AdminOperationReport => ({
  reportId: `report-${operationId}`,
  operationId,
  operationType,
  status: "completed",
  dryRun: false,
  message: `${operationType} completed`,
  createdAt: "2026-02-25T00:00:00.000Z",
  performedBy: "ops-1",
});

const defaultDiagnostics: SystemDiagnosticsSummary = {
  generatedAt: "2026-02-25T00:00:00.000Z",
  totalJobs: 0,
  runningJobs: 0,
  completedJobs: 0,
  failedJobs: 0,
  reportsGenerated: 0,
};

const defaultHouseholdStatuses: HouseholdOperationsStatus[] = [
  {
    householdId: "household-1",
    memberCount: 2,
    pendingInvitationCount: 1,
    updatedAt: "2026-02-25T00:00:00.000Z",
  },
];

const defaultInvitations: HouseholdInvitationRecord[] = [
  {
    invitationId: "invite-1",
    householdId: "household-1",
    invitedUserId: "user-2",
    invitedByUserId: "user-1",
    status: "pending",
    createdAt: "2026-02-25T00:00:00.000Z",
  },
];

const defaultSessionDiagnostic: UserSessionDiagnostic = {
  subjectId: "user-1",
  householdId: "household-1",
  hasActiveSession: true,
  expiresAtEpochSeconds: 2_200_000_000,
  lastValidatedAt: "2026-02-25T00:00:00.000Z",
};

const defaultRecipes: AdminRecipeRecord[] = [
  {
    recipeId: "recipe-1",
    slug: "vegetarische-pasta",
    title: "Vegetarische pasta",
    visibility: "household",
    prepMinutes: 25,
    tags: ["vegetarisch", "snel"],
    updatedAt: "2026-02-25T00:00:00.000Z",
    updatedBy: "ops-1",
  },
];

const defaultWeekMenus: AdminWeekMenuRecord[] = [
  {
    weekMenuId: "wm-1",
    householdId: "household-1",
    week: 9,
    kcal: 1800,
    basePersons: 2,
    mealCount: 7,
    updatedAt: "2026-02-25T00:00:00.000Z",
    updatedBy: "ops-1",
  },
];

const defaultMappingOverrides: AdminMappingOverrideRecord[] = [
  {
    overrideId: "override-1",
    sourceKey: "kipfilet",
    targetKey: "kipfilet rauw",
    note: "gestandaardiseerde mapping",
    updatedAt: "2026-02-25T00:00:00.000Z",
    updatedBy: "ops-1",
  },
];

const createApi = (
  overrides?: Partial<AdminDashboardApi>,
): AdminDashboardApi => ({
  runIngest: async () => ({
    ok: true,
    data: createReport("ingest-1", "ingest"),
  }),
  runRecompute: async () => ({
    ok: true,
    data: createReport("recompute-1", "recompute"),
  }),
  updateConfig: async () => ({
    ok: true,
    data: createReport("config-1", "config_update"),
  }),
  runCleanup: async () => ({
    ok: true,
    data: createReport("cleanup-1", "cleanup"),
  }),
  getDiagnostics: async () => ({
    ok: true,
    data: defaultDiagnostics,
  }),
  getJobs: async () => ({
    ok: true,
    data: [],
  }),
  listRecipes: async () => ({
    ok: true,
    data: defaultRecipes,
  }),
  upsertRecipe: async () => ({
    ok: true,
    data: createReport("recipe-upsert-1", "config_update"),
  }),
  deleteRecipe: async () => ({
    ok: true,
    data: createReport("recipe-delete-1", "cleanup"),
  }),
  listWeekMenus: async () => ({
    ok: true,
    data: defaultWeekMenus,
  }),
  upsertWeekMenu: async () => ({
    ok: true,
    data: createReport("weekmenu-upsert-1", "config_update"),
  }),
  deleteWeekMenu: async () => ({
    ok: true,
    data: createReport("weekmenu-delete-1", "cleanup"),
  }),
  listMappingOverrides: async () => ({
    ok: true,
    data: defaultMappingOverrides,
  }),
  upsertMappingOverride: async () => ({
    ok: true,
    data: createReport("override-upsert-1", "config_update"),
  }),
  deleteMappingOverride: async () => ({
    ok: true,
    data: createReport("override-delete-1", "cleanup"),
  }),
  listHouseholdStatuses: async () => ({
    ok: true,
    data: defaultHouseholdStatuses,
  }),
  listHouseholdInvitations: async () => ({
    ok: true,
    data: defaultInvitations,
  }),
  resendHouseholdInvitation: async () => ({
    ok: true,
    data: createReport("invite-resend-1", "cleanup"),
  }),
  resetHouseholdSession: async () => ({
    ok: true,
    data: createReport("session-reset-1", "cleanup"),
  }),
  diagnoseUserSession: async () => ({
    ok: true,
    data: defaultSessionDiagnostic,
  }),
  pgLogin: async () => ({
    ok: true,
    data: {
      message: "Succesvol ingelogd bij Project Gezond.",
      cookieNames: ["session"],
      statusCode: 200,
    },
  }),
  pgDiscover: async () => ({
    ok: true,
    data: {
      availableWeeks: [202609, 202610],
      probedWeeks: [202607, 202608, 202609, 202610, 202611],
      errors: [],
      defaultKcals: [2000],
      defaultBasePersons: [2],
    },
  }),
  listGoldWeekPlans: async () => ({
    ok: true,
    data: [],
  }),
  getIngestStatus: async () => ({
    ok: true,
    data: {
      jobId: "job-1",
      jobType: "ingest",
      status: "completed" as const,
      phase: "Klaar",
      processed: 0,
      total: 0,
      errors: [],
      startedAt: "2026-02-25T00:00:00.000Z",
    },
  }),
  getJobStatus: async () => ({
    ok: true,
    data: {
      jobId: "job-2",
      jobType: "discover-recipes",
      status: "completed" as const,
      phase: "Klaar",
      processed: 0,
      total: 0,
      errors: [],
      startedAt: "2026-02-25T00:00:00.000Z",
    },
  }),
  reprocessFromBronze: async () => ({
    ok: true,
    data: { filesScanned: 10, processed: 40, totalMeals: 1680, errors: [] },
  }),
  ingestRecipeWeb: async () => ({
    ok: true,
    data: { totalRecipes: 50, fetched: 48, withData: 45, errors: [] },
  }),
  discoverAndImportRecipes: async () => ({
    ok: true,
    data: { jobId: "discover-recipes-1" },
  }),
  fetchRecipeImages: async () => ({
    ok: true,
    data: { jobId: "fetch-images-1" },
  }),
  downloadRecipeImages: async () => ({
    ok: true,
    data: { jobId: "download-images-1" },
  }),
  ...overrides,
});

test("admin dashboard data view supports loading and empty state transitions", async () => {
  let resolveDiagnostics: (value: ApiEnvelope<SystemDiagnosticsSummary>) => void = () => {};
  const diagnosticsPromise = new Promise<ApiEnvelope<SystemDiagnosticsSummary>>((resolve) => {
    resolveDiagnostics = resolve;
  });

  const controller = new AdminDashboardController(
    createApi({
      getDiagnostics: async () => diagnosticsPromise,
    }),
  );

  const loadPromise = controller.loadDataView();
  assert.equal(controller.getState().views.data.status, "loading");

  resolveDiagnostics({
    ok: true,
    data: defaultDiagnostics,
  });

  await loadPromise;
  const state = controller.getState();
  assert.equal(state.views.data.status, "empty");
  assert.equal(state.views.data.data?.diagnostics.totalJobs, 0);
});

test("admin dashboard extract view exposes success when jobs exist", async () => {
  const jobs: SystemJobRecord[] = [
    {
      jobId: "system-job-1",
      operationId: "cleanup-1",
      operationType: "cleanup",
      mode: "execute",
      status: "completed",
      startedAt: "2026-02-25T00:00:00.000Z",
      finishedAt: "2026-02-25T00:00:01.000Z",
      actorId: "ops-1",
      message: "cleanup completed",
    },
  ];

  const controller = new AdminDashboardController(
    createApi({
      getJobs: async () => ({
        ok: true,
        data: jobs,
      }),
    }),
  );

  await controller.loadExtractView();
  const state = controller.getState();
  assert.equal(state.views.extract.status, "success");
  assert.equal(state.views.extract.data?.jobs.length, 1);
});

test("admin dashboard critical flows run ingest/recompute/cleanup and diagnostics", async () => {
  const controller = new AdminDashboardController(
    createApi({
      getDiagnostics: async () => ({
        ok: true,
        data: {
          ...defaultDiagnostics,
          totalJobs: 3,
          completedJobs: 3,
          reportsGenerated: 3,
          lastOperationAt: "2026-02-25T00:03:00.000Z",
        },
      }),
    }),
  );

  await controller.runIngest({
    operationId: "ingest-1",
    weeks: [9],
    kcals: [1800],
    basePersons: [2],
  });
  await controller.runRecompute({
    operationId: "recompute-1",
    transformVersion: "gold-v1",
    week: 9,
    kcal: 1800,
    basePersons: 2,
  });
  await controller.runCleanup({
    operationId: "cleanup-1",
    dryRun: true,
    targets: ["out/v3/tmp"],
  });
  await controller.runDiagnostics();

  const state = controller.getState();
  assert.equal(state.views.operations.status, "success");
  assert.equal(state.views.operations.data?.history.length, 3);
  assert.equal(state.views.operations.data?.lastReport?.operationType, "cleanup");
  assert.equal(state.views.data.status, "success");
});

test("admin dashboard settings and operations show error state on API failure", async () => {
  const controller = new AdminDashboardController(
    createApi({
      updateConfig: async () => ({
        ok: false,
        error: {
          code: "FORBIDDEN",
          message: "Geen toegang",
        },
      }),
      runCleanup: async () => ({
        ok: false,
        error: {
          code: "INVALID_BODY",
          message: "Request body is invalid.",
          hint: "targets requires at least one value",
        },
      }),
    }),
  );

  await controller.updateConfig({
    operationId: "config-1",
    key: "feature.toggle",
    value: true,
  });
  assert.equal(controller.getState().views.operations.status, "error");

  await controller.runCleanup({
    operationId: "cleanup-1",
    dryRun: true,
    targets: [],
  });

  const state = controller.getState();
  assert.equal(state.views.operations.status, "error");
  assert.equal(state.views.operations.error?.code, "INVALID_BODY");
});

test("admin dashboard config update validates keys and value types before api call", async () => {
  let updateConfigCalls = 0;
  const controller = new AdminDashboardController(
    createApi({
      updateConfig: async () => {
        updateConfigCalls += 1;
        return {
          ok: true,
          data: createReport("config-validated", "config_update"),
        };
      },
    }),
  );

  await controller.updateConfig({
    operationId: "config-invalid-key",
    key: "unknown.setting",
    value: true,
  });
  let state = controller.getState();
  assert.equal(updateConfigCalls, 0);
  assert.equal(state.views.operations.status, "error");
  assert.equal(state.views.operations.error?.code, "INVALID_CONFIG_KEY");

  await controller.updateConfig({
    operationId: "config-invalid-value",
    key: "matching.autoAcceptMin",
    value: "0.8",
  });
  state = controller.getState();
  assert.equal(updateConfigCalls, 0);
  assert.equal(state.views.operations.status, "error");
  assert.equal(state.views.operations.error?.code, "INVALID_CONFIG_VALUE");

  await controller.updateConfig({
    operationId: "config-valid",
    key: "matching.autoAcceptMin",
    value: 0.8,
  });
  state = controller.getState();
  assert.equal(updateConfigCalls, 1);
  assert.equal(state.views.settings.status, "success");
  assert.equal(state.views.settings.data?.entries[0]?.key, "matching.autoAcceptMin");
});

test("admin dashboard settings view keeps config audit trail with actor and timestamp", async () => {
  const controller = new AdminDashboardController(
    createApi({
      updateConfig: async (body) => ({
        ok: true,
        data: {
          ...createReport(body.operationId, "config_update"),
          createdAt: body.operationId === "config-1" ? "2026-02-25T10:00:00.000Z" : "2026-02-25T10:05:00.000Z",
          performedBy: body.operationId === "config-1" ? "ops-1" : "ops-2",
        },
      }),
    }),
  );

  await controller.updateConfig({
    operationId: "config-1",
    key: "feature.toggle",
    value: true,
  });
  await controller.updateConfig({
    operationId: "config-2",
    key: "llm.model",
    value: "gpt-5-mini",
  });

  const state = controller.getState();
  assert.equal(state.views.settings.status, "success");
  assert.equal(state.views.settings.data?.auditTrail.length, 2);
  assert.deepEqual(state.views.settings.data?.auditTrail[0], {
    operationId: "config-1",
    key: "feature.toggle",
    value: true,
    updatedAt: "2026-02-25T10:00:00.000Z",
    updatedBy: "ops-1",
  });
  assert.deepEqual(state.views.settings.data?.auditTrail[1], {
    operationId: "config-2",
    key: "llm.model",
    value: "gpt-5-mini",
    updatedAt: "2026-02-25T10:05:00.000Z",
    updatedBy: "ops-2",
  });
});

test("admin dashboard operations supports household status, invite resend and session diagnostics", async () => {
  const controller = new AdminDashboardController(createApi());

  await controller.loadHouseholdOperations("household-1");
  let state = controller.getState();
  assert.equal(state.views.operations.status, "success");
  assert.equal(state.views.operations.data?.householdStatuses.length, 1);
  assert.equal(state.views.operations.data?.invitations.length, 1);

  await controller.diagnoseSession("user-1");
  state = controller.getState();
  assert.equal(state.views.operations.data?.sessionStatuses.length, 1);
  assert.equal(state.views.operations.data?.sessionStatuses[0]?.subjectId, "user-1");

  await controller.resendInvitation({
    householdId: "household-1",
    invitedUserId: "user-2",
  });
  await controller.resetSession({
    householdId: "household-1",
    subjectId: "user-1",
  });

  state = controller.getState();
  assert.equal(state.views.operations.status, "success");
  assert.equal(state.views.operations.data?.history.length, 2);
});

test("admin dashboard data management supports recipe, weekmenu and mapping override workflows", async () => {
  const controller = new AdminDashboardController(createApi());

  await controller.loadDataManagement();
  let state = controller.getState();
  assert.equal(state.views.data.status, "success");
  assert.equal(state.views.data.data?.recipes.length, 1);
  assert.equal(state.views.data.data?.weekMenus.length, 1);
  assert.equal(state.views.data.data?.mappingOverrides.length, 1);

  await controller.upsertRecipe({
    operationId: "recipe-upsert-2",
    recipe: {
      recipeId: "recipe-2",
      slug: "snelle-curry",
      title: "Snelle curry",
      visibility: "shared",
      prepMinutes: 20,
      tags: ["kruidig"],
    },
  });
  await controller.upsertWeekMenu({
    operationId: "weekmenu-upsert-2",
    weekMenu: {
      weekMenuId: "wm-2",
      householdId: "household-1",
      week: 10,
      kcal: 2000,
      basePersons: 2,
      mealCount: 7,
    },
  });
  await controller.upsertMappingOverride({
    operationId: "override-upsert-2",
    override: {
      overrideId: "override-2",
      sourceKey: "tomaten",
      targetKey: "tomaat",
      note: "enkelvoud normalisatie",
    },
  });
  state = controller.getState();
  assert.equal(state.views.data.data?.recipes.length, 2);
  assert.equal(state.views.data.data?.weekMenus.length, 2);
  assert.equal(state.views.data.data?.mappingOverrides.length, 2);

  await controller.deleteRecipe({
    operationId: "recipe-delete-2",
    recipeId: "recipe-1",
  });
  await controller.deleteWeekMenu({
    operationId: "weekmenu-delete-2",
    weekMenuId: "wm-1",
  });
  await controller.deleteMappingOverride({
    operationId: "override-delete-2",
    overrideId: "override-1",
  });

  state = controller.getState();
  assert.equal(state.views.data.status, "success");
  assert.equal(state.views.data.data?.recipes.length, 1);
  assert.equal(state.views.data.data?.recipes[0]?.recipeId, "recipe-2");
  assert.equal(state.views.data.data?.weekMenus.length, 1);
  assert.equal(state.views.data.data?.weekMenus[0]?.weekMenuId, "wm-2");
  assert.equal(state.views.data.data?.mappingOverrides.length, 1);
  assert.equal(state.views.data.data?.mappingOverrides[0]?.overrideId, "override-2");
});
