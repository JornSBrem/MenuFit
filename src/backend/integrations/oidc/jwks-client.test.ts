import assert from "node:assert/strict";
import test from "node:test";

import { JwksClient, JwksClientError } from "./jwks-client.ts";

const makeResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const sampleJwk = (kid: string) => ({
  kty: "RSA",
  kid,
  use: "sig",
  alg: "RS256",
  n: "sampleModulus",
  e: "AQAB",
});

test("JwksClient returns cached key within max age", async () => {
  let fetchCount = 0;
  let now = 1_000_000;

  const client = new JwksClient({
    jwksUri: "https://example.com/.well-known/jwks.json",
    cacheMaxAgeMs: 60_000,
    minRefetchIntervalMs: 30_000,
    nowMs: () => now,
    fetchFn: async () => {
      fetchCount++;
      return makeResponse({ keys: [sampleJwk("key-1")] });
    },
  });

  const key1 = await client.getKey("key-1");
  assert.ok(key1, "should find key-1");
  assert.equal(key1!.kid, "key-1");
  assert.equal(fetchCount, 1);

  now += 10_000;
  const key1Again = await client.getKey("key-1");
  assert.ok(key1Again, "should return cached key");
  assert.equal(fetchCount, 1, "should not re-fetch within cache window");
});

test("JwksClient re-fetches after cache max age", async () => {
  let fetchCount = 0;
  let now = 1_000_000;

  const client = new JwksClient({
    jwksUri: "https://example.com/.well-known/jwks.json",
    cacheMaxAgeMs: 5_000,
    minRefetchIntervalMs: 1_000,
    nowMs: () => now,
    fetchFn: async () => {
      fetchCount++;
      return makeResponse({ keys: [sampleJwk("key-1")] });
    },
  });

  await client.getKey("key-1");
  assert.equal(fetchCount, 1);

  now += 10_000; // past cache max age + min refetch interval
  await client.getKey("key-1");
  assert.equal(fetchCount, 2, "should re-fetch after cache expiry");
});

test("JwksClient returns null for unknown kid after fetch", async () => {
  const client = new JwksClient({
    jwksUri: "https://example.com/.well-known/jwks.json",
    fetchFn: async () => makeResponse({ keys: [sampleJwk("key-1")] }),
  });

  const unknown = await client.getKey("key-999");
  assert.equal(unknown, null, "should return null for unknown kid");
});

test("JwksClient refreshKeys forces re-fetch ignoring interval", async () => {
  let fetchCount = 0;

  const client = new JwksClient({
    jwksUri: "https://example.com/.well-known/jwks.json",
    minRefetchIntervalMs: 999_999,
    fetchFn: async () => {
      fetchCount++;
      return makeResponse({ keys: [sampleJwk("key-1")] });
    },
  });

  await client.getKey("key-1");
  assert.equal(fetchCount, 1);

  await client.refreshKeys();
  assert.equal(fetchCount, 2, "refreshKeys should force fetch");
});

test("JwksClient picks up new key after rotation via refreshKeys", async () => {
  let generation = 1;

  const client = new JwksClient({
    jwksUri: "https://example.com/.well-known/jwks.json",
    minRefetchIntervalMs: 999_999,
    fetchFn: async () => {
      const keys = generation === 1 ? [sampleJwk("key-1")] : [sampleJwk("key-1"), sampleJwk("key-2")];
      return makeResponse({ keys });
    },
  });

  const beforeRotation = await client.getKey("key-2");
  assert.equal(beforeRotation, null);

  generation = 2;
  await client.refreshKeys();

  const afterRotation = await client.getKey("key-2");
  assert.ok(afterRotation, "should find key-2 after rotation");
});

test("JwksClient throws JwksClientError on HTTP error", async () => {
  const client = new JwksClient({
    jwksUri: "https://example.com/.well-known/jwks.json",
    fetchFn: async () => makeResponse({}, 503),
  });

  await assert.rejects(
    () => client.getKey("key-1"),
    (error: unknown) => {
      assert.ok(error instanceof JwksClientError);
      assert.equal(error.code, "JWKS_HTTP_ERROR");
      return true;
    },
  );
});

test("JwksClient throws JwksClientError on fetch network failure", async () => {
  const client = new JwksClient({
    jwksUri: "https://example.com/.well-known/jwks.json",
    fetchFn: async () => {
      throw new Error("network error");
    },
  });

  await assert.rejects(
    () => client.getKey("key-1"),
    (error: unknown) => {
      assert.ok(error instanceof JwksClientError);
      assert.equal(error.code, "JWKS_FETCH_ERROR");
      return true;
    },
  );
});

test("JwksClient throws JwksClientError on invalid JWKS format", async () => {
  const client = new JwksClient({
    jwksUri: "https://example.com/.well-known/jwks.json",
    fetchFn: async () => makeResponse({ notKeys: [] }),
  });

  await assert.rejects(
    () => client.getKey("key-1"),
    (error: unknown) => {
      assert.ok(error instanceof JwksClientError);
      assert.equal(error.code, "JWKS_INVALID_FORMAT");
      return true;
    },
  );
});

test("JwksClient ignores keys without kid", async () => {
  const client = new JwksClient({
    jwksUri: "https://example.com/.well-known/jwks.json",
    fetchFn: async () =>
      makeResponse({
        keys: [
          { kty: "RSA", n: "noKid", e: "AQAB" }, // no kid
          sampleJwk("key-1"),
        ],
      }),
  });

  const key = await client.getKey("key-1");
  assert.ok(key);
  assert.equal(key!.kid, "key-1");
});
