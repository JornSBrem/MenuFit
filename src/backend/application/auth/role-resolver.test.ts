import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveAdminRoleFromClaims } from "./role-resolver.ts";

describe("resolveAdminRoleFromClaims", () => {
  it("returns null for empty claims", () => {
    assert.strictEqual(resolveAdminRoleFromClaims({}), null);
  });

  it("returns null for unrecognised role values", () => {
    assert.strictEqual(resolveAdminRoleFromClaims({ role: "viewer" }), null);
    assert.strictEqual(resolveAdminRoleFromClaims({ "menufit:role": "admin" }), null);
  });

  // ---- priority 1: app_metadata.role (Supabase) ----

  it("resolves owner from app_metadata.role", () => {
    assert.strictEqual(
      resolveAdminRoleFromClaims({ app_metadata: { role: "owner" } }),
      "owner",
    );
  });

  it("resolves operator from app_metadata.role", () => {
    assert.strictEqual(
      resolveAdminRoleFromClaims({ app_metadata: { role: "operator" } }),
      "operator",
    );
  });

  it("app_metadata.role is case-insensitive", () => {
    assert.strictEqual(
      resolveAdminRoleFromClaims({ app_metadata: { role: "Owner" } }),
      "owner",
    );
  });

  it("app_metadata.role takes priority over other claims", () => {
    assert.strictEqual(
      resolveAdminRoleFromClaims({
        app_metadata: { role: "owner" },
        "menufit:role": "operator",
        role: "operator",
      }),
      "owner",
    );
  });

  // ---- priority 2: menufit:role ----

  it("resolves operator from menufit:role", () => {
    assert.strictEqual(
      resolveAdminRoleFromClaims({ "menufit:role": "operator" }),
      "operator",
    );
  });

  it("menufit:role takes priority over direct role", () => {
    assert.strictEqual(
      resolveAdminRoleFromClaims({ "menufit:role": "owner", role: "operator" }),
      "owner",
    );
  });

  // ---- priority 3: roles (array) ----

  it("resolves owner from roles array", () => {
    assert.strictEqual(
      resolveAdminRoleFromClaims({ roles: ["user", "owner"] }),
      "owner",
    );
  });

  it("resolves operator from roles array when owner is absent", () => {
    assert.strictEqual(
      resolveAdminRoleFromClaims({ roles: ["operator", "user"] }),
      "operator",
    );
  });

  it("resolves from roles as string", () => {
    assert.strictEqual(
      resolveAdminRoleFromClaims({ roles: "operator" }),
      "operator",
    );
  });

  // ---- priority 4: direct role ----

  it("resolves owner from direct role claim", () => {
    assert.strictEqual(
      resolveAdminRoleFromClaims({ role: "owner" }),
      "owner",
    );
  });

  it("direct role claim is case-insensitive", () => {
    assert.strictEqual(
      resolveAdminRoleFromClaims({ role: "OPERATOR" }),
      "operator",
    );
  });

  // ---- ignores non-admin app_metadata ----

  it("falls through to menufit:role when app_metadata.role is non-admin", () => {
    assert.strictEqual(
      resolveAdminRoleFromClaims({
        app_metadata: { role: "viewer" },
        "menufit:role": "operator",
      }),
      "operator",
    );
  });
});
