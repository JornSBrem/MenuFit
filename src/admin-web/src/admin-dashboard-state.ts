import type { AdminApiError, AdminOperationReport, AdminTab } from "./types";

export interface AdminDashboardState {
  selectedTab: AdminTab;
  pending: boolean;
  lastReport?: AdminOperationReport;
  lastError?: AdminApiError;
}

export const createInitialAdminDashboardState = (): AdminDashboardState => ({
  selectedTab: "data",
  pending: false,
});

export const setAdminPending = (
  state: AdminDashboardState,
  pending: boolean,
): AdminDashboardState => ({
  ...state,
  pending,
});

export const setAdminTab = (
  state: AdminDashboardState,
  selectedTab: AdminTab,
): AdminDashboardState => ({
  ...state,
  selectedTab,
});

export const applyAdminReport = (
  state: AdminDashboardState,
  report: AdminOperationReport,
): AdminDashboardState => ({
  ...state,
  pending: false,
  lastReport: report,
  lastError: undefined,
});

export const applyAdminError = (
  state: AdminDashboardState,
  error: AdminApiError,
): AdminDashboardState => ({
  ...state,
  pending: false,
  lastError: error,
});
