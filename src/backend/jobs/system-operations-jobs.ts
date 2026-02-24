import { SystemOperationsService } from "../application/system/system-operations-service.ts";
import type { SystemOperationReport, SystemOperationRequest } from "../application/system/types.ts";

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
