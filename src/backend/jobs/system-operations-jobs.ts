import { SystemOperationsService } from "../application/system/system-operations-service.ts";
import type { SystemOperationReport, SystemOperationRequest } from "../application/system/types.ts";
import { ProductionJobCoordinator } from "./job-coordinator.ts";
import type { SchedulerRunRecord } from "./types.ts";

export const runBackupJob = (
  service: SystemOperationsService,
  request: SystemOperationRequest,
): SystemOperationReport => service.runBackup(request);

export const runRestoreJob = (
  service: SystemOperationsService,
  request: SystemOperationRequest,
): SystemOperationReport => service.runRestore(request);

export const runCleanupJob = (
  service: SystemOperationsService,
  request: SystemOperationRequest,
): SystemOperationReport => service.runCleanup(request);

export const runScheduledBackupJob = async (
  coordinator: ProductionJobCoordinator,
  service: SystemOperationsService,
  request: SystemOperationRequest,
): Promise<{ run: SchedulerRunRecord; report?: SystemOperationReport }> => {
  let report: SystemOperationReport | undefined;
  const run = await coordinator.runSystemJob(
    request.operationId,
    async () => {
      report = service.runBackup(request);
    },
    request.target,
  );
  return { run, report };
};

export const runScheduledRestoreJob = async (
  coordinator: ProductionJobCoordinator,
  service: SystemOperationsService,
  request: SystemOperationRequest,
): Promise<{ run: SchedulerRunRecord; report?: SystemOperationReport }> => {
  let report: SystemOperationReport | undefined;
  const run = await coordinator.runSystemJob(
    request.operationId,
    async () => {
      report = service.runRestore(request);
    },
    request.target,
  );
  return { run, report };
};

export const runScheduledCleanupJob = async (
  coordinator: ProductionJobCoordinator,
  service: SystemOperationsService,
  request: SystemOperationRequest,
): Promise<{ run: SchedulerRunRecord; report?: SystemOperationReport }> => {
  let report: SystemOperationReport | undefined;
  const run = await coordinator.runSystemJob(
    request.operationId,
    async () => {
      report = service.runCleanup(request);
    },
    request.target,
  );
  return { run, report };
};

export const runScheduledIngestJob = async (
  coordinator: ProductionJobCoordinator,
  operationId: string,
  run: () => Promise<void> | void,
): Promise<SchedulerRunRecord> => coordinator.runIngestJob(operationId, run);
