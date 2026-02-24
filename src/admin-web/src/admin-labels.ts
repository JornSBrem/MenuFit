import type { AdminApiError, AdminOperationReport, AdminTab } from "./types.ts";
import type { AdminLocale } from "./i18n/index.ts";
import { translateAdmin } from "./i18n/index.ts";

const tabLabelKeys: Record<AdminTab, "admin.tab.data" | "admin.tab.settings" | "admin.tab.extract" | "admin.tab.operations"> = {
  data: "admin.tab.data",
  settings: "admin.tab.settings",
  extract: "admin.tab.extract",
  operations: "admin.tab.operations",
};

const operationLabelKeys: Record<
  AdminOperationReport["operationType"],
  | "admin.operation.ingest"
  | "admin.operation.recompute"
  | "admin.operation.config_update"
  | "admin.operation.cleanup"
  | "admin.operation.cutover_checklist"
> = {
  ingest: "admin.operation.ingest",
  recompute: "admin.operation.recompute",
  config_update: "admin.operation.config_update",
  cleanup: "admin.operation.cleanup",
  cutover_checklist: "admin.operation.cutover_checklist",
};

const statusLabelKeys: Record<AdminOperationReport["status"], "admin.status.completed" | "admin.status.dry_run"> = {
  completed: "admin.status.completed",
  dry_run: "admin.status.dry_run",
};

export const getAdminTabLabel = (
  tab: AdminTab,
  locale: AdminLocale = "nl",
): string => translateAdmin(tabLabelKeys[tab], { locale });

export const getAdminOperationTypeLabel = (
  operationType: AdminOperationReport["operationType"],
  locale: AdminLocale = "nl",
): string => translateAdmin(operationLabelKeys[operationType], { locale });

export const getAdminOperationStatusLabel = (
  status: AdminOperationReport["status"],
  locale: AdminLocale = "nl",
): string => translateAdmin(statusLabelKeys[status], { locale });

export const getAdminPendingLabel = (
  pending: boolean,
  locale: AdminLocale = "nl",
): string => translateAdmin(pending ? "admin.pending.true" : "admin.pending.false", { locale });

export const formatAdminErrorLabel = (
  error: AdminApiError,
  locale: AdminLocale = "nl",
): string =>
  translateAdmin(error.hint ? "admin.error.with_hint" : "admin.error.without_hint", {
    locale,
    values: {
      code: error.code,
      message: error.message,
      hint: error.hint ?? "",
    },
  });
