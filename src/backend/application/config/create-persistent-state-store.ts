import type { RuntimeConfigStore } from "../../../shared/config/index.ts";
import { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";

const DEFAULT_STATE_STORE_PATH = "out/v3/state/menu-fit-state.json";
const DEFAULT_SQLITE_STORE_PATH = "out/v3/state/menu-fit-state.sqlite";
const DEFAULT_POSTGRES_LOCK_PATH = "out/v3/state/menu-fit-state.postgres.lock";

export const createPersistentStateStore = (
  config: RuntimeConfigStore,
): PersistentStateStore => {
  const configuredDriver = String(config.get<string>("STATE_STORE_DRIVER") ?? "file")
    .trim()
    .toLowerCase();
  const driver =
    configuredDriver === "sqlite"
      ? "sqlite"
      : configuredDriver === "postgres"
        ? "postgres"
        : "file";

  const filePath =
    driver === "sqlite"
      ? String(config.get<string>("STATE_STORE_SQLITE_PATH") ?? "").trim() || DEFAULT_SQLITE_STORE_PATH
      : driver === "postgres"
        ? String(config.get<string>("STATE_STORE_POSTGRES_LOCK_PATH") ?? "").trim() ||
          DEFAULT_POSTGRES_LOCK_PATH
      : String(config.get<string>("STATE_STORE_PATH") ?? "").trim() || DEFAULT_STATE_STORE_PATH;

  const postgresConnectionString =
    driver === "postgres"
      ? String(config.get<string>("STATE_STORE_POSTGRES_URL") ?? "").trim() || undefined
      : undefined;
  if (driver === "postgres" && !postgresConnectionString) {
    throw new Error("STATE_STORE_POSTGRES_URL is required when STATE_STORE_DRIVER=postgres.");
  }

  return new PersistentStateStore(filePath, {
    driver,
    postgresConnectionString,
  });
};
