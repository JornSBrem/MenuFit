import assert from "node:assert/strict";
import test from "node:test";

import { SessionLifecycleService } from "../../../application/auth/session-lifecycle-service.ts";
import {
  authorizeAdminFromBearerHeader,
  authorizeUserFromBearerHeader,
} from "./session-middleware.ts";

test("session middleware authorizes valid user/admin bearer headers", () => {
  const service = new SessionLifecycleService({
    nowEpochSeconds: () => 1_800_000_000,
  });

  const user = service.issueUserSession({
    subjectId: "user-1",
    picnicAccountId: "picnic-1",
  });
  const admin = service.issueAdminSession({
    subjectId: "ops-1",
    adminRole: "operator",
  });

  const userResult = authorizeUserFromBearerHeader(service, `Bearer ${user.token}`);
  assert.equal(userResult.ok, true);
  assert.equal(userResult.data?.sessionKind, "user");

  const adminResult = authorizeAdminFromBearerHeader(service, `Bearer ${admin.token}`);
  assert.equal(adminResult.ok, true);
  assert.equal(adminResult.data?.sessionKind, "admin");
});

test("session middleware rejects wrong kind revoked and malformed headers", () => {
  let now = 1_810_000_000;
  const service = new SessionLifecycleService({
    nowEpochSeconds: () => now,
    userTtlSeconds: 10,
  });

  const user = service.issueUserSession({
    subjectId: "user-1",
    picnicAccountId: "picnic-1",
  });
  const admin = service.issueAdminSession({
    subjectId: "ops-1",
    adminRole: "owner",
  });

  const wrongKind = authorizeAdminFromBearerHeader(service, `Bearer ${user.token}`);
  assert.equal(wrongKind.ok, false);
  assert.equal(wrongKind.error?.code, "FORBIDDEN_SESSION");

  service.revokeSessionToken(admin.token);
  const revoked = authorizeAdminFromBearerHeader(service, `Bearer ${admin.token}`);
  assert.equal(revoked.ok, false);
  assert.equal(revoked.error?.code, "SESSION_REVOKED");

  now += 11;
  const expired = authorizeUserFromBearerHeader(service, `Bearer ${user.token}`);
  assert.equal(expired.ok, false);
  assert.equal(expired.error?.code, "SESSION_EXPIRED");

  const malformed = authorizeUserFromBearerHeader(service, "Basic token");
  assert.equal(malformed.ok, false);
  assert.equal(malformed.error?.code, "INVALID_AUTH_HEADER");
});
