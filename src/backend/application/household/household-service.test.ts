import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";
import { HouseholdService, HouseholdServiceError } from "./household-service.ts";

test("bootstrap creates household with head membership and is idempotent per user", () => {
  const service = new HouseholdService({
    now: () => "2026-02-25T08:00:00.000Z",
  });

  const created = service.bootstrapHousehold("head-1");
  assert.equal(created.householdId, "household-1");
  assert.equal(created.members.length, 1);
  assert.equal(created.members[0]?.role, "head");

  const repeat = service.bootstrapHousehold("head-1");
  assert.equal(repeat.householdId, "household-1");
  assert.equal(repeat.members.length, 1);
});

test("head can invite user and invited member can accept", () => {
  const service = new HouseholdService({
    now: () => "2026-02-25T08:05:00.000Z",
  });

  const houseA = service.bootstrapHousehold("head-a");
  const houseB = service.bootstrapHousehold("head-b");

  const inviteA = service.inviteMember({
    householdId: houseA.householdId,
    actorUserId: "head-a",
    invitedUserId: "member-1",
  });
  const inviteB = service.inviteMember({
    householdId: houseB.householdId,
    actorUserId: "head-b",
    invitedUserId: "member-1",
  });

  const pendingBefore = service.listPendingInvitationsForUser("member-1");
  assert.equal(pendingBefore.length, 2);

  const accepted = service.acceptInvitation({
    invitationId: inviteA.invitationId,
    actorUserId: "member-1",
  });
  assert.equal(accepted.household.householdId, houseA.householdId);
  assert.equal(accepted.invitation.status, "accepted");
  assert.equal(accepted.revokedInvitationIds.includes(inviteB.invitationId), true);

  const memberHousehold = service.getHouseholdForUser("member-1");
  assert.equal(memberHousehold?.householdId, houseA.householdId);
  assert.equal(
    memberHousehold?.members.some((member) => member.userId === "member-1"),
    true,
  );
  assert.equal(service.listPendingInvitationsForUser("member-1").length, 0);
});

test("invite flow is head-only", () => {
  const service = new HouseholdService({
    now: () => "2026-02-25T08:10:00.000Z",
  });

  const household = service.bootstrapHousehold("head-a");
  const invitation = service.inviteMember({
    householdId: household.householdId,
    actorUserId: "head-a",
    invitedUserId: "member-1",
  });
  service.acceptInvitation({
    invitationId: invitation.invitationId,
    actorUserId: "member-1",
  });

  assert.throws(
    () =>
      service.inviteMember({
        householdId: household.householdId,
        actorUserId: "member-1",
        invitedUserId: "member-2",
      }),
    (error: unknown) => {
      assert.ok(error instanceof HouseholdServiceError);
      assert.equal(error.code, "HOUSEHOLD_FORBIDDEN");
      return true;
    },
  );
});

test("accept flow is restricted to invited user", () => {
  const service = new HouseholdService({
    now: () => "2026-02-25T08:15:00.000Z",
  });

  const household = service.bootstrapHousehold("head-a");
  const invitation = service.inviteMember({
    householdId: household.householdId,
    actorUserId: "head-a",
    invitedUserId: "member-1",
  });

  assert.throws(
    () =>
      service.acceptInvitation({
        invitationId: invitation.invitationId,
        actorUserId: "member-2",
      }),
    (error: unknown) => {
      assert.ok(error instanceof HouseholdServiceError);
      assert.equal(error.code, "INVITATION_FORBIDDEN");
      return true;
    },
  );
});

test("households and invitations persist across service restarts", () => {
  const dir = mkdtempSync(join(tmpdir(), "menufit-household-"));
  try {
    const stateStore = new PersistentStateStore(join(dir, "state.json"));

    const firstService = new HouseholdService({
      stateStore,
      now: () => "2026-02-25T09:00:00.000Z",
    });
    const household = firstService.bootstrapHousehold("head-a");
    const invitation = firstService.inviteMember({
      householdId: household.householdId,
      actorUserId: "head-a",
      invitedUserId: "member-1",
    });
    firstService.acceptInvitation({
      invitationId: invitation.invitationId,
      actorUserId: "member-1",
    });

    const secondService = new HouseholdService({
      stateStore,
      now: () => "2026-02-25T09:05:00.000Z",
    });
    const restored = secondService.getHouseholdForUser("member-1");
    assert.equal(restored?.householdId, household.householdId);

    const nextHouse = secondService.bootstrapHousehold("head-b");
    assert.equal(nextHouse.householdId, "household-2");
    const nextInvite = secondService.inviteMember({
      householdId: nextHouse.householdId,
      actorUserId: "head-b",
      invitedUserId: "member-2",
    });
    assert.equal(nextInvite.invitationId, "invite-2");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
