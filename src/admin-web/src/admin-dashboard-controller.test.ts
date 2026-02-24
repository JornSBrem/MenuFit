import assert from "node:assert/strict";
import test from "node:test";

import {
  AdminDashboardController,
  type AdminDashboardApi,
} from "./admin-dashboard-controller.ts";
import type {
  AdminOperationReport,
  ApiEnvelope,
  SystemDiagnosticsSummary,
  SystemJobRecord,
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
