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
