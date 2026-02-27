export type BronzeSource = "pg" | "picnic";

export type BronzeEntityType =
  | "pg.week_menu"
  | "pg.day_menu"
  | "pg.recipe"
  | "pg.shopping_list_pdf"
  | "picnic.search_result"
  | "picnic.product_detail";

export interface BronzeObjectMetadata {
  source: BronzeSource;
  entityType: BronzeEntityType;
  year: number;
  week: number;
  basePersons: number;
  fetchedAt: string;
  sha256: string;
  schemaVersion: string;
  requestMeta: Record<string, string>;
}

export interface LineageStamp {
  bronzeVersionSetId: string;
  silverTransformVersion: string;
  matchingVersion: string;
  llmPolicyVersion: string;
  generatedAt: string;
}

export interface MedallionStoragePaths {
  bronzeRoot: string;
  silverDatabase: string;
  goldDatabase: string;
}

export const DEFAULT_MEDALLION_PATHS: MedallionStoragePaths = {
  bronzeRoot: "out/v3/bronze",
  silverDatabase: "db/v3.sqlite",
  goldDatabase: "db/v3.sqlite",
};
