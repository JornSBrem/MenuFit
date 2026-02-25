import type { RuntimeConfigStore } from "../../../shared/config/index.ts";
import {
  ExternalLeaseLockCoordinator,
  FileLeaseLockCoordinator,
  RedisCliLeaseLockClient,
} from "../../integrations/storage/distributed-lock.ts";
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

  const lockBackend = String(config.get<string>("STATE_LOCK_BACKEND") ?? "file")
    .trim()
    .toLowerCase();
  const leaseTtlMs = Number(config.get<number>("STATE_LOCK_LEASE_TTL_MS") ?? 30_000);
  const maxWaitMs = Number(config.get<number>("STATE_LOCK_MAX_WAIT_MS") ?? 5_000);
  const retryDelayMs = Number(config.get<number>("STATE_LOCK_RETRY_DELAY_MS") ?? 50);
  const renewIntervalMs = Number(config.get<number>("STATE_LOCK_RENEW_INTERVAL_MS") ?? 10_000);
  const failOpen = Boolean(config.get<boolean>("STATE_LOCK_FAIL_OPEN") ?? true);
  const lockKey =
    String(config.get<string>("STATE_LOCK_KEY") ?? "").trim() || "persistent-state-store";

  const lockCoordinator =
    lockBackend === "redis"
      ? new ExternalLeaseLockCoordinator(
          lockKey,
          new RedisCliLeaseLockClient({
            redisUrl: (() => {
              const url = String(config.get<string>("STATE_LOCK_REDIS_URL") ?? "").trim();
              if (!url) {
                throw new Error("STATE_LOCK_REDIS_URL is required when STATE_LOCK_BACKEND=redis.");
              }
              return url;
            })(),
            keyPrefix: String(config.get<string>("STATE_LOCK_REDIS_KEY_PREFIX") ?? "").trim() || "menufit:locks",
          }),
          {
            leaseTtlMs,
            maxWaitMs,
            retryDelayMs,
            renewIntervalMs,
            failOpen,
          },
        )
      : new FileLeaseLockCoordinator(`${filePath}.lock`, {
          leaseTtlMs,
          maxWaitMs,
          retryDelayMs,
        });

  return new PersistentStateStore(filePath, {
    driver,
    postgresConnectionString,
    lockCoordinator,
  });
};
