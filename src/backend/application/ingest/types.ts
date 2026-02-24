import type { BronzeEntityType, BronzeObjectMetadata } from "../../domain/storage/medallion-schema";

export interface IngestMatrixRequest {
  weeks: number[];
  kcals: number[];
  basePersons: number[];
}

export interface IngestTask {
  source: "pg";
  entityType: BronzeEntityType;
  week: number;
  kcal: number;
  basePersons: number;
  requestUrl: string;
}

export interface IngestRetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  backoffMultiplier: number;
}

export interface IngestTaskResult {
  task: IngestTask;
  metadata: BronzeObjectMetadata;
  filePath: string;
  bytes: number;
  verified: boolean;
}

export interface BronzeManifestRecord {
  id: string;
  entityType: BronzeEntityType;
  source: "pg";
  filePath: string;
  metadata: BronzeObjectMetadata;
  bytes: number;
  verified: boolean;
  createdAt: string;
}

export interface BronzeManifest {
  version: number;
  generatedAt: string;
  records: BronzeManifestRecord[];
}
