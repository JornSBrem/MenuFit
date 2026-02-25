import assert from "node:assert/strict";
import { generateKeyPairSync, sign as cryptoSign, type KeyObject } from "node:crypto";
import test from "node:test";

import { JwksClient } from "../../integrations/oidc/jwks-client.ts";
import { JwtVerifier } from "../../integrations/oidc/jwt-verifier.ts";
import { OAuthFlowError, OAuthFlowService } from "./oauth-flow-service.ts";
import { SessionLifecycleService } from "./session-lifecycle-service.ts";

// Generate RSA key pair for ID token signing
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

const buildIdToken = (claims: object, key: KeyObject = privateKey): string => {
  const header = { alg: "RS256", kid: TEST_KID, typ: "JWT" };
  const headerB64 = encodeB64Url(JSON.stringify(header));
  const payloadB64 = encodeB64Url(JSON.stringify(claims));
  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`);
  const signature = cryptoSign("SHA256", signingInput, key);
  return `${headerB64}.${payloadB64}.${encodeB64Url(signature)}`;
};

const makeJwksClient = () =>
  new JwksClient({
    jwksUri: "https://idp.example.com/.well-known/jwks.json",
    fetchFn: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        keys: [{ ...publicJwk, kid: TEST_KID, use: "sig", alg: "RS256" }],
      }),
    }),
  });

const makeService = (overrides?: {
  fetchFn?: OAuthFlowService extends { handleCallback: (...args: infer A) => infer R }
    ? unknown
    : unknown;
  tokenResponse?: object;
}) => {
  const jwtVerifier = new JwtVerifier({ jwksClient: makeJwksClient() });
  const lifecycle = new SessionLifecycleService({ nowEpochSeconds: () => NOW });

  const defaultClaims = {
    sub: "user-abc",
    iss: TEST_ISSUER,
    aud: TEST_CLIENT_ID,
    exp: NOW + 3600,
    iat: NOW,
  };

  const tokenResponse = overrides?.tokenResponse ?? {
    access_token: "at-xyz",
    token_type: "Bearer",
    id_token: buildIdToken(defaultClaims),
  };

  const fetchFn = async (_url: string, _init: unknown) => ({
    ok: true,
    status: 200,
    json: async () => tokenResponse,
  });

  const service = new OAuthFlowService(
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
      generateState: () => "fixed-state-value",
      fetchFn,
      nowEpochSeconds: () => NOW,
    },
  );

  return { service, lifecycle };
};

test("OAuthFlowService buildAuthorizationUrl returns correct URL and state", () => {
  const { service } = makeService();
  const result = service.buildAuthorizationUrl();

  assert.equal(result.state, "fixed-state-value");
  assert.ok(result.url.startsWith("https://idp.example.com/oauth/authorize"));
  assert.ok(result.url.includes("response_type=code"));
  assert.ok(result.url.includes(`client_id=${TEST_CLIENT_ID}`));
  assert.ok(result.url.includes("state=fixed-state-value"));
  assert.ok(result.url.includes("scope=openid"));
});

test("OAuthFlowService handleCallback issues user session on valid code+state", async () => {
  const { service } = makeService();
  const result = await service.handleCallback({
    code: "auth-code-123",
    state: "fixed-state-value",
    expectedState: "fixed-state-value",
  });

  assert.equal(result.session.sessionKind, "user");
  assert.equal(result.session.subjectId, "user-abc");
  assert.ok(result.token.startsWith("user:"));
  assert.equal(result.idTokenClaims.sub, "user-abc");
});

test("OAuthFlowService handleCallback issues admin session for operator role", async () => {
  const jwtVerifier = new JwtVerifier({ jwksClient: makeJwksClient() });
  const lifecycle = new SessionLifecycleService({ nowEpochSeconds: () => NOW });

  const adminClaims = {
    sub: "admin-1",
    iss: TEST_ISSUER,
    aud: TEST_CLIENT_ID,
    exp: NOW + 3600,
    iat: NOW,
    "menufit:role": "operator",
  };

  const service = new OAuthFlowService(
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
      generateState: () => "state",
      fetchFn: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "at",
          token_type: "Bearer",
          id_token: buildIdToken(adminClaims),
        }),
      }),
      nowEpochSeconds: () => NOW,
    },
  );

  const result = await service.handleCallback({
    code: "code",
    state: "state",
    expectedState: "state",
  });

  assert.equal(result.session.sessionKind, "admin");
  assert.equal(result.session.adminRole, "operator");
});

test("OAuthFlowService rejects state mismatch", async () => {
  const { service } = makeService();

  await assert.rejects(
    () =>
      service.handleCallback({
        code: "code",
        state: "wrong-state",
        expectedState: "correct-state",
      }),
    (error: unknown) => {
      assert.ok(error instanceof OAuthFlowError);
      assert.equal(error.code, "OAUTH_STATE_MISMATCH");
      return true;
    },
  );
});

test("OAuthFlowService rejects empty code", async () => {
  const { service } = makeService();

  await assert.rejects(
    () =>
      service.handleCallback({
        code: "",
        state: "state",
        expectedState: "state",
      }),
    (error: unknown) => {
      assert.ok(error instanceof OAuthFlowError);
      assert.equal(error.code, "OAUTH_MISSING_CODE");
      return true;
    },
  );
});

test("OAuthFlowService rejects missing id_token in token response", async () => {
  const { service } = makeService({
    tokenResponse: { access_token: "at", token_type: "Bearer" }, // no id_token
  });

  await assert.rejects(
    () =>
      service.handleCallback({
        code: "code",
        state: "fixed-state-value",
        expectedState: "fixed-state-value",
      }),
    (error: unknown) => {
      assert.ok(error instanceof OAuthFlowError);
      assert.equal(error.code, "OAUTH_MISSING_ID_TOKEN");
      return true;
    },
  );
});

test("OAuthFlowService rejects invalid id_token signature", async () => {
  const { privateKey: otherKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const badClaims = {
    sub: "user-x",
    iss: TEST_ISSUER,
    aud: TEST_CLIENT_ID,
    exp: NOW + 3600,
    iat: NOW,
  };

  const { service } = makeService({
    tokenResponse: {
      access_token: "at",
      token_type: "Bearer",
      id_token: buildIdToken(badClaims, otherKey as KeyObject),
    },
  });

  await assert.rejects(
    () =>
      service.handleCallback({
        code: "code",
        state: "fixed-state-value",
        expectedState: "fixed-state-value",
      }),
    (error: unknown) => {
      assert.ok(error instanceof OAuthFlowError);
      assert.equal(error.code, "OAUTH_INVALID_ID_TOKEN");
      return true;
    },
  );
});

test("OAuthFlowService rejects token endpoint HTTP error", async () => {
  const jwtVerifier = new JwtVerifier({ jwksClient: makeJwksClient() });
  const lifecycle = new SessionLifecycleService({ nowEpochSeconds: () => NOW });

  const service = new OAuthFlowService(
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
      generateState: () => "state",
      fetchFn: async () => ({ ok: false, status: 401, json: async () => ({}) }),
      nowEpochSeconds: () => NOW,
    },
  );

  await assert.rejects(
    () =>
      service.handleCallback({
        code: "code",
        state: "state",
        expectedState: "state",
      }),
    (error: unknown) => {
      assert.ok(error instanceof OAuthFlowError);
      assert.equal(error.code, "OAUTH_TOKEN_HTTP_ERROR");
      return true;
    },
  );
});
