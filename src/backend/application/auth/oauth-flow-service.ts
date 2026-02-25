import { randomBytes } from "node:crypto";

import type { JwtVerifier } from "../../integrations/oidc/jwt-verifier.ts";
import { JwtVerificationError } from "../../integrations/oidc/jwt-verifier.ts";
import type { JwtClaims } from "../../integrations/oidc/types.ts";
import type { SessionLifecycleService } from "./session-lifecycle-service.ts";
import type { AdminRole, AppSessionRecord } from "./types.ts";

export interface OAuthProviderConfig {
  /** Authorization endpoint URL */
  authorizationEndpoint: string;
  /** Token endpoint URL */
  tokenEndpoint: string;
  /** Client identifier */
  clientId: string;
  /** Client secret */
  clientSecret: string;
  /** Post-login redirect URI registered at the IdP */
  redirectUri: string;
  /** Expected JWT issuer (OIDC `iss` claim) */
  issuer: string;
  /** OAuth scopes to request */
  scopes?: string[];
}

export interface OAuthFlowServiceOptions {
  /** Override random bytes generation for testing */
  generateState?: () => string;
  /** Override token fetch for testing */
  fetchFn?: (
    url: string,
    init: { method: string; headers: Record<string, string>; body: string },
  ) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;
  /** Override clock for testing */
  nowEpochSeconds?: () => number;
}

export interface AuthorizationUrlResult {
  /** URL the user should be redirected to */
  url: string;
  /** State token to store in session/cookie for CSRF verification */
  state: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

export interface OAuthCallbackParams {
  code: string;
  state: string;
  /** Previously issued state value to verify against */
  expectedState: string;
}

export interface OAuthCallbackResult {
  session: AppSessionRecord;
  token: string;
  idTokenClaims: JwtClaims;
}

export class OAuthFlowError extends Error {
  readonly code: string;

  readonly hint?: string;

  constructor(code: string, message: string, hint?: string) {
    super(message);
    this.name = "OAuthFlowError";
    this.code = code;
    this.hint = hint;
  }
}

const DEFAULT_SCOPES = ["openid", "profile", "email"];

const generateStateDefault = (): string =>
  randomBytes(16).toString("base64url");

/** Derive admin role from OIDC claims, returns null for regular users */
const extractAdminRole = (claims: JwtClaims): AdminRole | null => {
  // Convention: claims.roles or claims["menufit:role"] carries admin role
  const roles: unknown =
    claims["menufit:role"] ??
    claims["roles"] ??
    null;

  if (roles === "owner") return "owner";
  if (roles === "operator") return "operator";

  if (Array.isArray(roles)) {
    if (roles.includes("owner")) return "owner";
    if (roles.includes("operator")) return "operator";
  }

  return null;
};

export class OAuthFlowService {
  private readonly config: OAuthProviderConfig;

  private readonly jwtVerifier: JwtVerifier;

  private readonly lifecycleService: SessionLifecycleService;

  private readonly generateState: () => string;

  private readonly fetchFn: OAuthFlowServiceOptions["fetchFn"];

  private readonly nowEpochSeconds: () => number;

  constructor(
    config: OAuthProviderConfig,
    jwtVerifier: JwtVerifier,
    lifecycleService: SessionLifecycleService,
    options?: OAuthFlowServiceOptions,
  ) {
    this.config = config;
    this.jwtVerifier = jwtVerifier;
    this.lifecycleService = lifecycleService;
    this.generateState = options?.generateState ?? generateStateDefault;
    this.fetchFn = options?.fetchFn;
    this.nowEpochSeconds = options?.nowEpochSeconds ?? (() => Math.floor(Date.now() / 1000));
  }

  /**
   * Build the authorization URL to redirect the user to the IdP.
   * Returns a state token that must be stored server-side (e.g. in a cookie)
   * and verified during the callback.
   */
  buildAuthorizationUrl(): AuthorizationUrlResult {
    const state = this.generateState();
    const scopes = this.config.scopes ?? DEFAULT_SCOPES;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: scopes.join(" "),
      state,
    });

    return {
      url: `${this.config.authorizationEndpoint}?${params.toString()}`,
      state,
    };
  }

  /**
   * Handle the OAuth callback: verify state, exchange code for tokens,
   * validate the ID token, and issue an app session.
   */
  async handleCallback(params: OAuthCallbackParams): Promise<OAuthCallbackResult> {
    if (!params.code?.trim()) {
      throw new OAuthFlowError("OAUTH_MISSING_CODE", "Authorization code is required");
    }

    if (!params.state?.trim() || params.state !== params.expectedState) {
      throw new OAuthFlowError(
        "OAUTH_STATE_MISMATCH",
        "OAuth state parameter mismatch — possible CSRF attack",
      );
    }

    const tokenResponse = await this.exchangeCode(params.code);

    if (!tokenResponse.id_token) {
      throw new OAuthFlowError(
        "OAUTH_MISSING_ID_TOKEN",
        "Token response does not include an id_token",
        "Ensure the openid scope is requested",
      );
    }

    let idTokenClaims: JwtClaims;
    try {
      const verified = await this.jwtVerifier.verify(tokenResponse.id_token, {
        issuer: this.config.issuer,
        audience: this.config.clientId,
        nowEpochSeconds: this.nowEpochSeconds,
      });
      idTokenClaims = verified.claims;
    } catch (error) {
      if (error instanceof JwtVerificationError) {
        throw new OAuthFlowError(
          "OAUTH_INVALID_ID_TOKEN",
          `ID token validation failed: ${error.message}`,
          error.code,
        );
      }
      throw error;
    }

    const subjectId = idTokenClaims.sub;
    if (!subjectId?.trim()) {
      throw new OAuthFlowError("OAUTH_MISSING_SUB", "ID token missing sub claim");
    }

    const adminRole = extractAdminRole(idTokenClaims);

    if (adminRole) {
      const { token, session } = this.lifecycleService.issueAdminSession({
        subjectId,
        adminRole,
      });
      return { session, token, idTokenClaims };
    }

    // For user sessions, picnicAccountId may be carried in claims or derived from sub
    const picnicAccountId =
      typeof idTokenClaims["picnic_account_id"] === "string"
        ? idTokenClaims["picnic_account_id"]
        : subjectId;

    const { token, session } = this.lifecycleService.issueUserSession({
      subjectId,
      picnicAccountId,
    });

    return { session, token, idTokenClaims };
  }

  private async exchangeCode(code: string): Promise<OAuthTokenResponse> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    const fetchFn =
      this.fetchFn ??
      ((url, init) =>
        fetch(url, init).then((res) => ({
          ok: res.ok,
          status: res.status,
          json: () => res.json(),
        })));

    let response: { ok: boolean; status: number; json(): Promise<unknown> };
    try {
      response = await fetchFn(this.config.tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
    } catch (error) {
      throw new OAuthFlowError(
        "OAUTH_TOKEN_FETCH_ERROR",
        `Token endpoint request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!response.ok) {
      throw new OAuthFlowError(
        "OAUTH_TOKEN_HTTP_ERROR",
        `Token endpoint returned HTTP ${response.status}`,
      );
    }

    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      throw new OAuthFlowError("OAUTH_TOKEN_PARSE_ERROR", "Failed to parse token response as JSON");
    }

    if (typeof parsed !== "object" || parsed === null) {
      throw new OAuthFlowError("OAUTH_TOKEN_INVALID", "Token response is not a JSON object");
    }

    const resp = parsed as Record<string, unknown>;
    if (typeof resp["access_token"] !== "string") {
      throw new OAuthFlowError(
        "OAUTH_TOKEN_INVALID",
        "Token response missing access_token",
      );
    }

    return {
      access_token: resp["access_token"],
      token_type: typeof resp["token_type"] === "string" ? resp["token_type"] : "Bearer",
      expires_in: typeof resp["expires_in"] === "number" ? resp["expires_in"] : undefined,
      refresh_token: typeof resp["refresh_token"] === "string" ? resp["refresh_token"] : undefined,
      id_token: typeof resp["id_token"] === "string" ? resp["id_token"] : undefined,
      scope: typeof resp["scope"] === "string" ? resp["scope"] : undefined,
    };
  }
}
