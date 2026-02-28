import assert from "node:assert/strict";
import test from "node:test";

import { HouseholdService } from "../../../application/household/household-service.ts";
import { createHouseholdRouteHandlers } from "./household-routes.ts";
import { parseSessionToken } from "../auth/session-context.ts";

const headSession = parseSessionToken("user:head-1:token-head:picnic-head");
const memberSession = parseSessionToken("user:member-1:token-member:picnic-member");
const otherUserSession = parseSessionToken("user:member-2:token-member-2:picnic-member-2");
const adminSession = parseSessionToken("admin:ops-user:token-admin:owner");

test("household routes accept admin sessions (admin is also a user)", () => {
  const service = new HouseholdService({
    now: () => "2026-02-25T10:00:00.000Z",
  });
  const handlers = createHouseholdRouteHandlers(service);

  const response = handlers.bootstrap(adminSession);
  assert.equal(response.ok, true);
  assert.ok(response.data?.household);
});

test("household routes support bootstrap invite accept and status flow", () => {
  const service = new HouseholdService({
    now: () => "2026-02-25T10:10:00.000Z",
  });
  const handlers = createHouseholdRouteHandlers(service);

  const bootstrap = handlers.bootstrap(headSession);
  assert.equal(bootstrap.ok, true);
  const householdId = bootstrap.data?.household?.householdId;
  assert.equal(householdId, "household-1");

  const invite = handlers.invite(headSession, {
    householdId: householdId ?? "",
    invitedUserId: "member-1",
  });
  assert.equal(invite.ok, true);
  assert.equal(invite.data?.status, "pending");

  const invitations = handlers.invitations(headSession, {
    householdId: householdId ?? "",
  });
  assert.equal(invitations.ok, true);
  assert.equal(invitations.data?.length, 1);

  const accept = handlers.accept(memberSession, {
    invitationId: invite.data?.invitationId ?? "",
  });
  assert.equal(accept.ok, true);
  assert.equal(accept.data?.invitation.status, "accepted");

  const memberStatus = handlers.me(memberSession);
  assert.equal(memberStatus.ok, true);
  assert.equal(memberStatus.data?.household?.householdId, householdId);
  assert.equal(memberStatus.data?.pendingInvitations.length, 0);

  const reinvite = handlers.invite(headSession, {
    householdId: householdId ?? "",
    invitedUserId: "member-1",
  });
  assert.equal(reinvite.ok, false);
  assert.equal(reinvite.error?.code, "USER_ALREADY_IN_HOUSEHOLD");
});

test("household routes validate payload and invited-user authorization", () => {
  const service = new HouseholdService({
    now: () => "2026-02-25T10:20:00.000Z",
  });
  const handlers = createHouseholdRouteHandlers(service);

  const bootstrap = handlers.bootstrap(headSession);
  const householdId = bootstrap.data?.household?.householdId ?? "";
  const invite = handlers.invite(headSession, {
    householdId,
    invitedUserId: "member-1",
  });

  const invalid = handlers.invite(headSession, {
    householdId,
    invitedUserId: "",
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error?.code, "INVALID_BODY");

  const forbiddenAccept = handlers.accept(otherUserSession, {
    invitationId: invite.data?.invitationId ?? "",
  });
  assert.equal(forbiddenAccept.ok, false);
  assert.equal(forbiddenAccept.error?.code, "INVITATION_FORBIDDEN");
});
