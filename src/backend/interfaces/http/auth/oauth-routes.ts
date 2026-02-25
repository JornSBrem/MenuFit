import {
  OAuthFlowError,
  OAuthFlowService,
} from "../../../application/auth/oauth-flow-service.ts";

export interface OAuthApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; hint?: string };
}

export interface AuthorizeResult {
  /** Redirect URL for the user agent */
  redirectUrl: string;
  /** State value — caller should store in a short-lived cookie/session */
  state: string;
}

export interface CallbackBody {
  /** Authorization code from IdP */
  code: string;
  /** State from IdP (echoed back from authorization request) */
  state: string;
  /** Previously stored state value for CSRF verification */
  expectedState: string;
}

export interface CallbackResult {
  /** Issued session token */
  token: string;
  sessionKind: "user" | "admin";
  subjectId: string;
  expiresAtEpochSeconds: number;
}

const fromOAuthError = (error: OAuthFlowError): OAuthApiEnvelope<never> => ({
  ok: false,
  error: { code: error.code, message: error.message, hint: error.hint },
});

/**
 * GET /auth/oidc/authorize
 * Returns the authorization URL the client should redirect to.
 */
export const handleOAuthAuthorize = (
  service: OAuthFlowService,
): OAuthApiEnvelope<AuthorizeResult> => {
  try {
    const { url, state } = service.buildAuthorizationUrl();
    return {
      ok: true,
      data: { redirectUrl: url, state },
    };
  } catch (error) {
    if (error instanceof OAuthFlowError) {
      return fromOAuthError(error);
    }
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "Authorization URL generation failed" },
    };
  }
};

/**
 * POST /auth/oidc/callback
 * Exchanges the authorization code for a session token.
 */
export const handleOAuthCallback = async (
  service: OAuthFlowService,
  body: CallbackBody,
): Promise<OAuthApiEnvelope<CallbackResult>> => {
  if (!body.code?.trim()) {
    return {
      ok: false,
      error: { code: "INVALID_BODY", message: "code is required" },
    };
  }
  if (!body.state?.trim()) {
    return {
      ok: false,
      error: { code: "INVALID_BODY", message: "state is required" },
    };
  }
  if (!body.expectedState?.trim()) {
    return {
      ok: false,
      error: {
        code: "INVALID_BODY",
        message: "expectedState is required",
        hint: "Pass the state value stored during the authorization request",
      },
    };
  }

  try {
    const result = await service.handleCallback({
      code: body.code,
      state: body.state,
      expectedState: body.expectedState,
    });

    return {
      ok: true,
      data: {
        token: result.token,
        sessionKind: result.session.sessionKind,
        subjectId: result.session.subjectId,
        expiresAtEpochSeconds: result.session.expiresAtEpochSeconds,
      },
    };
  } catch (error) {
    if (error instanceof OAuthFlowError) {
      return fromOAuthError(error);
    }
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "OAuth callback processing failed" },
    };
  }
};
