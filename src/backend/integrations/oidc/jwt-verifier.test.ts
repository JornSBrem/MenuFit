import assert from "node:assert/strict";
import { generateKeyPairSync, sign as cryptoSign, type KeyObject } from "node:crypto";
import test from "node:test";

import { JwksClient } from "./jwks-client.ts";
import { JwtVerificationError, JwtVerifier } from "./jwt-verifier.ts";

// Generate a real RSA key pair for signing/verification in tests
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });

const publicJwk = publicKey.export({ format: "jwk" }) as {
  kty: string;
  n: string;
  e: string;
  [key: string]: unknown;
};

const TEST_KID = "test-key-1";
const TEST_ISSUER = "https://idp.example.com";
const TEST_AUDIENCE = "menufit-api";

const encodeBase64Url = (data: Buffer | string): string => {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
};

const buildJwt = (
  header: object,
  payload: object,
  privateKeyObj: KeyObject = privateKey,
): string => {
  const headerB64 = encodeBase64Url(JSON.stringify(header));
  const payloadB64 = encodeBase64Url(JSON.stringify(payload));
  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`);
  const signature = cryptoSign("SHA256", signingInput, privateKeyObj);
  const signatureB64 = encodeBase64Url(signature);
  return `${headerB64}.${payloadB64}.${signatureB64}`;
};

const makeJwksClient = (kids: string[] = [TEST_KID]) => {
  const jwkWithKid = { ...publicJwk, kid: TEST_KID, use: "sig", alg: "RS256" };
  const keys = kids.map((kid) => ({ ...jwkWithKid, kid }));

  return new JwksClient({
    jwksUri: "https://idp.example.com/.well-known/jwks.json",
    fetchFn: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ keys }),
    }),
  });
};

const validClaims = (nowEpoch: number) => ({
  sub: "user-123",
  iss: TEST_ISSUER,
  aud: TEST_AUDIENCE,
  exp: nowEpoch + 3600,
  iat: nowEpoch,
});

const defaultHeader = { alg: "RS256", kid: TEST_KID, typ: "JWT" };

const NOW = 1_800_000_000;

test("JwtVerifier verifies valid RS256 JWT", async () => {
  const token = buildJwt(defaultHeader, validClaims(NOW));
  const verifier = new JwtVerifier({ jwksClient: makeJwksClient() });

  const result = await verifier.verify(token, {
    issuer: TEST_ISSUER,
    audience: TEST_AUDIENCE,
    nowEpochSeconds: () => NOW,
  });

  assert.equal(result.claims.sub, "user-123");
  assert.equal(result.header.alg, "RS256");
});

test("JwtVerifier rejects tampered JWT payload", async () => {
  const token = buildJwt(defaultHeader, validClaims(NOW));
  const [header, , sig] = token.split(".");
  const tamperedPayload = encodeBase64Url(
    JSON.stringify({ ...validClaims(NOW), sub: "attacker" }),
  );
  const tampered = `${header}.${tamperedPayload}.${sig}`;

  const verifier = new JwtVerifier({ jwksClient: makeJwksClient() });

  await assert.rejects(
    () => verifier.verify(tampered, { issuer: TEST_ISSUER, audience: TEST_AUDIENCE, nowEpochSeconds: () => NOW }),
    (error: unknown) => {
      assert.ok(error instanceof JwtVerificationError);
      assert.equal(error.code, "JWT_INVALID_SIGNATURE");
      return true;
    },
  );
});

test("JwtVerifier rejects expired JWT", async () => {
  const token = buildJwt(defaultHeader, { ...validClaims(NOW), exp: NOW - 1000 });
  const verifier = new JwtVerifier({ jwksClient: makeJwksClient() });

  await assert.rejects(
    () => verifier.verify(token, { issuer: TEST_ISSUER, audience: TEST_AUDIENCE, nowEpochSeconds: () => NOW }),
    (error: unknown) => {
      assert.ok(error instanceof JwtVerificationError);
      assert.equal(error.code, "JWT_EXPIRED");
      return true;
    },
  );
});

test("JwtVerifier rejects wrong issuer", async () => {
  const token = buildJwt(defaultHeader, { ...validClaims(NOW), iss: "https://attacker.com" });
  const verifier = new JwtVerifier({ jwksClient: makeJwksClient() });

  await assert.rejects(
    () => verifier.verify(token, { issuer: TEST_ISSUER, audience: TEST_AUDIENCE, nowEpochSeconds: () => NOW }),
    (error: unknown) => {
      assert.ok(error instanceof JwtVerificationError);
      assert.equal(error.code, "JWT_INVALID_ISSUER");
      return true;
    },
  );
});

test("JwtVerifier rejects wrong audience", async () => {
  const token = buildJwt(defaultHeader, { ...validClaims(NOW), aud: "other-service" });
  const verifier = new JwtVerifier({ jwksClient: makeJwksClient() });

  await assert.rejects(
    () => verifier.verify(token, { issuer: TEST_ISSUER, audience: TEST_AUDIENCE, nowEpochSeconds: () => NOW }),
    (error: unknown) => {
      assert.ok(error instanceof JwtVerificationError);
      assert.equal(error.code, "JWT_INVALID_AUDIENCE");
      return true;
    },
  );
});

test("JwtVerifier accepts audience in array claim", async () => {
  const token = buildJwt(defaultHeader, {
    ...validClaims(NOW),
    aud: ["other-service", TEST_AUDIENCE],
  });
  const verifier = new JwtVerifier({ jwksClient: makeJwksClient() });

  const result = await verifier.verify(token, {
    issuer: TEST_ISSUER,
    audience: TEST_AUDIENCE,
    nowEpochSeconds: () => NOW,
  });

  assert.equal(result.claims.sub, "user-123");
});

test("JwtVerifier rejects unsupported algorithm", async () => {
  const token = buildJwt({ alg: "HS256", kid: TEST_KID }, validClaims(NOW));
  const verifier = new JwtVerifier({ jwksClient: makeJwksClient() });

  await assert.rejects(
    () => verifier.verify(token, { issuer: TEST_ISSUER, audience: TEST_AUDIENCE, nowEpochSeconds: () => NOW }),
    (error: unknown) => {
      assert.ok(error instanceof JwtVerificationError);
      assert.equal(error.code, "JWT_UNSUPPORTED_ALG");
      return true;
    },
  );
});

test("JwtVerifier rejects malformed token", async () => {
  const verifier = new JwtVerifier({ jwksClient: makeJwksClient() });

  await assert.rejects(
    () => verifier.verify("not.a.valid.jwt.structure.here", { issuer: TEST_ISSUER, audience: TEST_AUDIENCE }),
    (error: unknown) => {
      assert.ok(error instanceof JwtVerificationError);
      assert.equal(error.code, "JWT_MALFORMED");
      return true;
    },
  );
});

test("JwtVerifier rejects missing kid in header", async () => {
  const token = buildJwt({ alg: "RS256", typ: "JWT" }, validClaims(NOW));
  const verifier = new JwtVerifier({ jwksClient: makeJwksClient() });

  await assert.rejects(
    () => verifier.verify(token, { issuer: TEST_ISSUER, audience: TEST_AUDIENCE, nowEpochSeconds: () => NOW }),
    (error: unknown) => {
      assert.ok(error instanceof JwtVerificationError);
      assert.equal(error.code, "JWT_MISSING_KID");
      return true;
    },
  );
});

test("JwtVerifier auto-refreshes JWKS on unknown kid (key rotation)", async () => {
  let generation = 1;
  const NEW_KID = "key-rotated";

  const { privateKey: newPrivateKey, publicKey: newPublicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const newPublicJwk = newPublicKey.export({ format: "jwk" }) as {
    kty: string; n: string; e: string;
  };

  const jwksClient = new JwksClient({
    jwksUri: "https://idp.example.com/.well-known/jwks.json",
    minRefetchIntervalMs: 999_999,
    fetchFn: async () => {
      const oldJwk = { ...publicJwk, kid: TEST_KID, use: "sig", alg: "RS256" };
      const newJwk = { ...newPublicJwk, kid: NEW_KID, use: "sig", alg: "RS256" };
      const keys = generation === 1 ? [oldJwk] : [oldJwk, newJwk];
      return {
        ok: true,
        status: 200,
        json: async () => ({ keys }),
      };
    },
  });

  // First fetch with old key
  await jwksClient.getKey(TEST_KID);

  // Rotate to new key
  generation = 2;
  const newHeader = { alg: "RS256", kid: NEW_KID, typ: "JWT" };
  const token = buildJwt(newHeader, validClaims(NOW), newPrivateKey as KeyObject);

  const verifier = new JwtVerifier({ jwksClient });
  const result = await verifier.verify(token, {
    issuer: TEST_ISSUER,
    audience: TEST_AUDIENCE,
    nowEpochSeconds: () => NOW,
  });

  assert.equal(result.header.kid, NEW_KID);
});

test("JwtVerifier rejects JWT with clock tolerance respected", async () => {
  // Expired exactly 10 seconds ago, with 30s tolerance → should pass
  const token = buildJwt(defaultHeader, { ...validClaims(NOW), exp: NOW - 10 });
  const verifier = new JwtVerifier({ jwksClient: makeJwksClient() });

  const result = await verifier.verify(token, {
    issuer: TEST_ISSUER,
    audience: TEST_AUDIENCE,
    nowEpochSeconds: () => NOW,
    clockToleranceSeconds: 30,
  });

  assert.equal(result.claims.sub, "user-123");
});

test("JwtVerifier rejects JWT with unknown kid after JWKS refresh", async () => {
  const jwksClient = new JwksClient({
    jwksUri: "https://idp.example.com/.well-known/jwks.json",
    minRefetchIntervalMs: 0,
    fetchFn: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ keys: [] }), // no keys
    }),
  });

  const token = buildJwt(defaultHeader, validClaims(NOW));
  const verifier = new JwtVerifier({ jwksClient });

  await assert.rejects(
    () => verifier.verify(token, { issuer: TEST_ISSUER, audience: TEST_AUDIENCE, nowEpochSeconds: () => NOW }),
    (error: unknown) => {
      assert.ok(error instanceof JwtVerificationError);
      assert.equal(error.code, "JWT_UNKNOWN_KID");
      return true;
    },
  );
});
