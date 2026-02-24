import type { RuntimeConfigStore } from "../../../shared/config/index.ts";
import { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";

const DEFAULT_STATE_STORE_PATH = "out/v3/state/menu-fit-state.json";

export const createPersistentStateStore = (
  config: RuntimeConfigStore,
): PersistentStateStore => {
  const configuredPath = String(config.get<string>("STATE_STORE_PATH") ?? "").trim();
  return new PersistentStateStore(configuredPath || DEFAULT_STATE_STORE_PATH);
};
