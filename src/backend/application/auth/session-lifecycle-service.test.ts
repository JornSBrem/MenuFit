import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";
import { SessionLifecycleError, SessionLifecycleService } from "./session-lifecycle-service.ts";

test("session lifecycle issues validates refreshes and revokes user sessions", () => {
  let now = 1_800_000_000;
  const service = new SessionLifecycleService({
    nowEpochSeconds: () => now,
    userTtlSeconds: 60,
  });

  const issued = service.issueUserSession({
    subjectId: "user-1",
    picnicAccountId: "picnic-1",
  });

  const validated = service.validateSessionToken(issued.token, { requiredKind: "user" });
  assert.equal(validated.subjectId, "user-1");
  assert.equal(validated.expiresAtEpochSeconds, now + 60);

  now += 10;
  const refreshed = service.refreshSessionToken(issued.token);
  assert.notEqual(refreshed.session.tokenId, validated.tokenId);
  assert.throws(
    () => service.validateSessionToken(issued.token),
    (error: unknown) => {
      assert.ok(error instanceof SessionLifecycleError);
      assert.equal(error.code, "SESSION_REVOKED");
      return true;
    },
  );

  service.revokeSessionToken(refreshed.token);
  assert.throws(
    () => service.validateSessionToken(refreshed.token),
    (error: unknown) => {
      assert.ok(error instanceof SessionLifecycleError);
      assert.equal(error.code, "SESSION_REVOKED");
      return true;
    },
  );
});

test("session lifecycle enforces expiry and required session kind", () => {
  let now = 1_900_000_000;
  const service = new SessionLifecycleService({
    nowEpochSeconds: () => now,
    adminTtlSeconds: 30,
  });

  const admin = service.issueAdminSession({
    subjectId: "ops-1",
    adminRole: "owner",
  });

  assert.throws(
    () => service.validateSessionToken(admin.token, { requiredKind: "user" }),
    (error: unknown) => {
      assert.ok(error instanceof SessionLifecycleError);
      assert.equal(error.code, "FORBIDDEN_SESSION");
      return true;
    },
  );

  now += 31;
  assert.throws(
    () => service.validateSessionToken(admin.token),
    (error: unknown) => {
      assert.ok(error instanceof SessionLifecycleError);
      assert.equal(error.code, "SESSION_EXPIRED");
      return true;
    },
  );
});

test("provider sessions support refresh guardrails", () => {
  let now = 1_850_000_000;
  const service = new SessionLifecycleService({
    nowEpochSeconds: () => now,
  });

  const provider = service.upsertProviderSession({
    provider: "picnic",
    subjectId: "user-1",
    accessToken: "access-1",
    refreshToken: "refresh-1",
    expiresAtEpochSeconds: now + 120,
  });
  assert.equal(provider.accessToken, "access-1");

  const refreshed = service.refreshProviderSession({
    provider: "picnic",
    subjectId: "user-1",
    accessToken: "access-2",
    refreshToken: "refresh-2",
    currentRefreshToken: "refresh-1",
    expiresAtEpochSeconds: now + 240,
  });
  assert.equal(refreshed.accessToken, "access-2");
  assert.equal(refreshed.refreshToken, "refresh-2");

  assert.throws(
    () =>
      service.refreshProviderSession({
        provider: "picnic",
        subjectId: "user-1",
        accessToken: "access-3",
        currentRefreshToken: "wrong-refresh",
        expiresAtEpochSeconds: now + 300,
      }),
    (error: unknown) => {
      assert.ok(error instanceof SessionLifecycleError);
      assert.equal(error.code, "PROVIDER_REFRESH_MISMATCH");
      return true;
    },
  );
});

test("session lifecycle rehydrates auth and provider sessions from persistent store", () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-auth-"));
  try {
    let now = 1_910_000_000;
    const stateStore = new PersistentStateStore(join(dir, "state.json"));

    const first = new SessionLifecycleService({
      nowEpochSeconds: () => now,
      stateStore,
      userTtlSeconds: 60,
    });
    const user = first.issueUserSession({
      subjectId: "user-1",
      picnicAccountId: "picnic-1",
    });
    first.upsertProviderSession({
      provider: "pg",
      subjectId: "user-1",
      accessToken: "pg-access-1",
      refreshToken: "pg-refresh-1",
      expiresAtEpochSeconds: now + 120,
    });

    now += 10;
    const second = new SessionLifecycleService({
      nowEpochSeconds: () => now,
      stateStore,
    });

    const validated = second.validateSessionToken(user.token, { requiredKind: "user" });
    assert.equal(validated.subjectId, "user-1");
    assert.equal(second.getProviderSession("pg", "user-1")?.accessToken, "pg-access-1");

    const refreshed = second.refreshSessionToken(user.token);
    assert.equal(refreshed.session.tokenId, "sess-2");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
