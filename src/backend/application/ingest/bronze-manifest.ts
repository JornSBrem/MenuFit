import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { BronzeManifest, BronzeManifestRecord } from "./types";

const MANIFEST_VERSION = 1;

export const readManifest = async (manifestPath: string): Promise<BronzeManifest> => {
  try {
    const content = await readFile(manifestPath, "utf8");
    const parsed = JSON.parse(content) as BronzeManifest;
    if (!Array.isArray(parsed.records)) {
      throw new Error("Invalid manifest: records is not an array");
    }
    return parsed;
  } catch {
    return {
      version: MANIFEST_VERSION,
      generatedAt: new Date().toISOString(),
      records: [],
    };
  }
};

export const appendManifestRecord = async (
  manifestPath: string,
  record: BronzeManifestRecord,
): Promise<BronzeManifest> => {
  const manifest = await readManifest(manifestPath);
  const next: BronzeManifest = {
    version: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    records: [...manifest.records, record],
  };

  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(next, null, 2), "utf8");
  return next;
};
