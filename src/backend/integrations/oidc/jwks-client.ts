import type { Jwk } from "./types.ts";

export interface JwksCacheEntry {
  jwk: Jwk;
  cachedAtMs: number;
}

export interface JwksFetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export interface JwksClientConfig {
  /** JWKS endpoint URI */
  jwksUri: string;
  /** How long to cache keys (ms). Default: 5 minutes */
  cacheMaxAgeMs?: number;
  /** Minimum interval before re-fetching (ms). Default: 30 seconds */
  minRefetchIntervalMs?: number;
  /** Override fetch function for testing */
  fetchFn?: (url: string) => Promise<JwksFetchResponse>;
  /** Override clock for testing */
  nowMs?: () => number;
}

export class JwksClientError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "JwksClientError";
    this.code = code;
  }
}

export class JwksClient {
  private readonly cache = new Map<string, JwksCacheEntry>();

  private lastFetchAtMs = 0;

  private readonly jwksUri: string;

  private readonly cacheMaxAgeMs: number;

  private readonly minRefetchIntervalMs: number;

  private readonly fetchFn: (url: string) => Promise<JwksFetchResponse>;

  private readonly nowMs: () => number;

  constructor(config: JwksClientConfig) {
    this.jwksUri = config.jwksUri;
    this.cacheMaxAgeMs = config.cacheMaxAgeMs ?? 5 * 60 * 1000;
    this.minRefetchIntervalMs = config.minRefetchIntervalMs ?? 30_000;
    this.fetchFn =
      config.fetchFn ??
      ((url) =>
        fetch(url).then((res) => ({
          ok: res.ok,
          status: res.status,
          json: () => res.json(),
        })));
    this.nowMs = config.nowMs ?? (() => Date.now());
  }

  /**
   * Retrieve a JWK by key ID.
   * Fetches from JWKS endpoint if key is not cached or cache is stale.
   * On cache miss after fetch, returns null.
   */
  async getKey(kid: string): Promise<Jwk | null> {
    const now = this.nowMs();
    const cached = this.cache.get(kid);

    if (cached && now - cached.cachedAtMs < this.cacheMaxAgeMs) {
      return cached.jwk;
    }

    const canRefetch = now - this.lastFetchAtMs >= this.minRefetchIntervalMs;
    if (!cached || canRefetch) {
      await this.fetchAndCache();
    }

    return this.cache.get(kid)?.jwk ?? null;
  }

  /**
   * Force a JWKS refresh regardless of cache/interval state.
   * Used when a token presents an unknown kid.
   */
  async refreshKeys(): Promise<void> {
    await this.fetchAndCache();
  }

  private async fetchAndCache(): Promise<void> {
    let response: JwksFetchResponse;
    try {
      response = await this.fetchFn(this.jwksUri);
    } catch (error) {
      throw new JwksClientError(
        "JWKS_FETCH_ERROR",
        `Failed to fetch JWKS from ${this.jwksUri}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!response.ok) {
      throw new JwksClientError(
        "JWKS_HTTP_ERROR",
        `JWKS endpoint returned HTTP ${response.status}`,
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new JwksClientError("JWKS_PARSE_ERROR", "Failed to parse JWKS response as JSON");
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !Array.isArray((body as { keys?: unknown }).keys)
    ) {
      throw new JwksClientError("JWKS_INVALID_FORMAT", "JWKS response missing 'keys' array");
    }

    const now = this.nowMs();
    this.lastFetchAtMs = now;

    for (const key of (body as { keys: unknown[] }).keys) {
      if (typeof key === "object" && key !== null) {
        const jwk = key as Jwk;
        if (typeof jwk.kid === "string" && jwk.kid) {
          this.cache.set(jwk.kid, { jwk, cachedAtMs: now });
        }
      }
    }
  }
}
