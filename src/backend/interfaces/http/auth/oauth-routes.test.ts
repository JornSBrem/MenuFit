import assert from "node:assert/strict";
import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import test from "node:test";

import { JwksClient } from "../../../integrations/oidc/jwks-client.ts";
import { JwtVerifier } from "../../../integrations/oidc/jwt-verifier.ts";
import { OAuthFlowService } from "../../../application/auth/oauth-flow-service.ts";
import { SessionLifecycleService } from "../../../application/auth/session-lifecycle-service.ts";
import { handleOAuthAuthorize, handleOAuthCallback } from "./oauth-routes.ts";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = publicKey.export({ format: "jwk" }) as { kty: string; n: string; e: string };
const TEST_KID = "oidc-key-1";
const TEST_ISSUER = "https://idp.example.com";
const TEST_CLIENT_ID = "menufit-client";
const NOW = 1_800_000_000;

const encodeB64Url = (data: Buffer | string): string => {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
};

const buildIdToken = (claims: object): string => {
  const header = { alg: "RS256", kid: TEST_KID, typ: "JWT" };
  const h = encodeB64Url(JSON.stringify(header));
  const p = encodeB64Url(JSON.stringify(claims));
  const sig = cryptoSign("SHA256", Buffer.from(`${h}.${p}`), privateKey);
  return `${h}.${p}.${encodeB64Url(sig)}`;
};

const makeFlowService = (idTokenClaims: object) => {
  const jwksClient = new JwksClient({
    jwksUri: "https://idp.example.com/.well-known/jwks.json",
    fetchFn: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ keys: [{ ...publicJwk, kid: TEST_KID, use: "sig", alg: "RS256" }] }),
    }),
  });
  const jwtVerifier = new JwtVerifier({ jwksClient });
  const lifecycle = new SessionLifecycleService({ nowEpochSeconds: () => NOW });

  return new OAuthFlowService(
    {
      authorizationEndpoint: "https://idp.example.com/oauth/authorize",
      tokenEndpoint: "https://idp.example.com/oauth/token",
      clientId: TEST_CLIENT_ID,
      clientSecret: "secret",
      redirectUri: "https://app.example.com/auth/callback",
      issuer: TEST_ISSUER,
    },
    jwtVerifier,
    lifecycle,
    {
      generateState: () => "test-state",
      fetchFn: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "at-xyz",
          token_type: "Bearer",
          id_token: buildIdToken(idTokenClaims),
        }),
      }),
      nowEpochSeconds: () => NOW,
    },
  );
};

const defaultClaims = {
  sub: "user-123",
  iss: TEST_ISSUER,
  aud: TEST_CLIENT_ID,
  exp: NOW + 3600,
  iat: NOW,
};

test("handleOAuthAuthorize returns authorization URL and state", () => {
  const service = makeFlowService(defaultClaims);
  const result = handleOAuthAuthorize(service);

  assert.ok(result.ok);
  assert.ok(result.data?.redirectUrl.includes("response_type=code"));
  assert.equal(result.data?.state, "test-state");
});

test("handleOAuthCallback returns session token on valid callback", async () => {
  const service = makeFlowService(defaultClaims);
  const result = await handleOAuthCallback(service, {
    code: "auth-code",
    state: "test-state",
    expectedState: "test-state",
  });

  assert.ok(result.ok);
  assert.ok(result.data?.token.startsWith("user:"));
  assert.equal(result.data?.sessionKind, "user");
  assert.equal(result.data?.subjectId, "user-123");
});

test("handleOAuthCallback returns error on missing code", async () => {
  const service = makeFlowService(defaultClaims);
  const result = await handleOAuthCallback(service, {
    code: "",
    state: "state",
    expectedState: "state",
  });

  assert.ok(!result.ok);
  assert.equal(result.error?.code, "INVALID_BODY");
});

test("handleOAuthCallback returns error on missing state", async () => {
  const service = makeFlowService(defaultClaims);
  const result = await handleOAuthCallback(service, {
    code: "code",
    state: "",
    expectedState: "state",
  });

  assert.ok(!result.ok);
  assert.equal(result.error?.code, "INVALID_BODY");
});

test("handleOAuthCallback returns error on state mismatch", async () => {
  const service = makeFlowService(defaultClaims);
  const result = await handleOAuthCallback(service, {
    code: "code",
    state: "wrong-state",
    expectedState: "correct-state",
  });

  assert.ok(!result.ok);
  assert.equal(result.error?.code, "OAUTH_STATE_MISMATCH");
});

test("handleOAuthCallback returns error on missing expectedState", async () => {
  const service = makeFlowService(defaultClaims);
  const result = await handleOAuthCallback(service, {
    code: "code",
    state: "state",
    expectedState: "",
  });

  assert.ok(!result.ok);
  assert.equal(result.error?.code, "INVALID_BODY");
});
