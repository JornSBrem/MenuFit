import { join } from "node:path";

import type { RuntimeConfigStore } from "../../../shared/config";
import type { BronzeObjectMetadata } from "../../domain/storage/medallion-schema.ts";
import { DEFAULT_MEDALLION_PATHS } from "../../domain/storage/medallion-schema.ts";
import {
  sha256Hex,
  verifyBronzePayloadChecksum,
  writeBronzeJson,
} from "../../integrations/storage/bronze-storage.ts";
import { appendManifestRecord } from "./bronze-manifest.ts";
import { withRetry } from "./retry.ts";
import type { IngestTask, IngestTaskResult, IngestRetryPolicy } from "./types";

export type FetchJson = (url: string, task: IngestTask) => Promise<unknown>;

const DEFAULT_RETRY_POLICY: IngestRetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 300,
  backoffMultiplier: 2,
};

const buildMetadata = (task: IngestTask, payload: unknown): BronzeObjectMetadata => {
  const payloadJson = JSON.stringify(payload);
  return {
    source: task.source,
    entityType: task.entityType,
    year: new Date().getUTCFullYear(),
    week: task.week,
    basePersons: task.basePersons,
    fetchedAt: new Date().toISOString(),
    sha256: sha256Hex(payloadJson),
    schemaVersion: "1.0.0",
    requestMeta: {
      requestUrl: task.requestUrl,
      ingestionMode: "bronze",
    },
  };
};

const manifestRecordId = (task: IngestTask, sha: string): string =>
  `${task.source}:${task.entityType}:${task.week}:${task.basePersons}:${sha}`;

export interface BronzeRunnerOptions {
  retryPolicy?: IngestRetryPolicy;
  bronzeRoot?: string;
  manifestPath?: string;
  /** Bij true wordt een mislukte taak overgeslagen i.p.v. een exception te gooien */
  continueOnError?: boolean;
}

export const runBronzeIngestTasks = async (
  tasks: IngestTask[],
  config: RuntimeConfigStore,
  fetchJson: FetchJson,
  options?: BronzeRunnerOptions,
): Promise<IngestTaskResult[]> => {
  const results: IngestTaskResult[] = [];
  const retryPolicy = options?.retryPolicy ?? DEFAULT_RETRY_POLICY;
  const bronzeRoot = options?.bronzeRoot ?? DEFAULT_MEDALLION_PATHS.bronzeRoot;
  const manifestPath = options?.manifestPath ?? join(bronzeRoot, "manifest.json");

  for (const task of tasks) {
    try {
      // Touch config to guarantee endpoint keys are loaded and validated by store.
      if (task.source === "pg") {
        config.get<string>("PG_LOGIN_URL");
      }

      const payload = await withRetry(() => fetchJson(task.requestUrl, task), retryPolicy);
      const metadata = buildMetadata(task, payload);
      const verified = verifyBronzePayloadChecksum(metadata, payload);
      if (!verified) {
        throw new Error(`Checksum verification failed for task ${task.entityType} week ${task.week}`);
      }

      const written = await writeBronzeJson(bronzeRoot, metadata, payload);
      await appendManifestRecord(manifestPath, {
        id: manifestRecordId(task, metadata.sha256),
        entityType: task.entityType,
        source: task.source,
        filePath: written.path,
        metadata,
        bytes: written.bytes,
        verified,
        createdAt: new Date().toISOString(),
      });

      results.push({
        task,
        metadata,
        filePath: written.path,
        bytes: written.bytes,
        verified,
      });
    } catch (err) {
      if (options?.continueOnError) {
        results.push({
          task,
          error: err instanceof Error ? err.message : String(err),
        });
      } else {
        throw err;
      }
    }
  }

  return results;
};
