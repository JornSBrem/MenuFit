import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { BronzeObjectMetadata } from "../../domain/storage/medallion-schema";

export const sha256Hex = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export const createBronzePath = (root: string, metadata: BronzeObjectMetadata): string =>
  join(
    root,
    metadata.source,
    metadata.entityType,
    `y=${metadata.year}`,
    `w=${metadata.week}`,
    `k=${metadata.kcal}`,
    `p=${metadata.basePersons}`,
    `${metadata.sha256}.json`,
  );

export const writeBronzeJson = async (
  root: string,
  metadata: BronzeObjectMetadata,
  payload: unknown,
): Promise<{ path: string; bytes: number }> => {
  const filePath = createBronzePath(root, metadata);
  const content = JSON.stringify({ metadata, payload }, null, 2);

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");

  return {
    path: filePath,
    bytes: Buffer.byteLength(content, "utf8"),
  };
};

export const verifyBronzePayloadChecksum = (
  metadata: BronzeObjectMetadata,
  payload: unknown,
): boolean => {
  const payloadJson = JSON.stringify(payload);
  return sha256Hex(payloadJson) === metadata.sha256;
};
