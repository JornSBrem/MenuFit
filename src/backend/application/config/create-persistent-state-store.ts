import type { RuntimeConfigStore } from "../../../shared/config/index.ts";
import { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";

const DEFAULT_STATE_STORE_PATH = "out/v3/state/menu-fit-state.json";
const DEFAULT_SQLITE_STORE_PATH = "out/v3/state/menu-fit-state.sqlite";

export const createPersistentStateStore = (
  config: RuntimeConfigStore,
): PersistentStateStore => {
  const configuredDriver = String(config.get<string>("STATE_STORE_DRIVER") ?? "file")
    .trim()
    .toLowerCase();
  const driver = configuredDriver === "sqlite" ? "sqlite" : "file";

  const filePath =
    driver === "sqlite"
      ? String(config.get<string>("STATE_STORE_SQLITE_PATH") ?? "").trim() || DEFAULT_SQLITE_STORE_PATH
      : String(config.get<string>("STATE_STORE_PATH") ?? "").trim() || DEFAULT_STATE_STORE_PATH;

  return new PersistentStateStore(filePath, { driver });
};
