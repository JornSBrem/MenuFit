import assert from "node:assert/strict";
import test from "node:test";

import {
  parseAuthorizationHeader,
  parseSessionToken,
  requireAdminSession,
  requireUserSession,
  SessionContextError,
} from "./session-context.ts";

test("session parser keeps user and admin sessions technically separated", () => {
  const user = parseSessionToken("user:user-1:token-1:picnic-abc");
  const admin = parseSessionToken("admin:admin-1:token-2:operator");

  assert.equal(requireUserSession(user).picnicAccountId, "picnic-abc");
  assert.equal(requireAdminSession(admin).adminRole, "operator");

  assert.throws(() => requireAdminSession(user), SessionContextError);
  assert.throws(() => requireUserSession(admin), SessionContextError);
});

test("authorization header parser validates bearer format", () => {
  const context = parseAuthorizationHeader("Bearer admin:admin-9:token-x:owner");
  assert.equal(context.sessionKind, "admin");

  assert.throws(
    () => parseAuthorizationHeader("Basic abc"),
    /Bearer scheme/,
  );
});

test("session parser validates optional token expiry", () => {
  const valid = parseSessionToken("user:user-2:token-9:picnic-user:1900000000", {
    requireExpiry: true,
    nowEpochSeconds: () => 1800000000,
  });
  assert.equal(valid.expiresAtEpochSeconds, 1900000000);

  assert.throws(
    () =>
      parseSessionToken("user:user-2:token-9:picnic-user", {
        requireExpiry: true,
        nowEpochSeconds: () => 1800000000,
      }),
    /must include expiry/,
  );

  assert.throws(
    () =>
      parseSessionToken("user:user-2:token-9:picnic-user:1700000000", {
        requireExpiry: true,
        nowEpochSeconds: () => 1800000000,
      }),
    /expired/,
  );
});
