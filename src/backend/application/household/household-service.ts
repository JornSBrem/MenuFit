import type { PersistentStateStore } from "../../integrations/storage/persistent-state-store.ts";
import type {
  AcceptHouseholdInvitationRequest,
  AcceptHouseholdInvitationResult,
  HouseholdInvitation,
  HouseholdRecord,
  InviteHouseholdMemberRequest,
  RevokeHouseholdInvitationRequest,
} from "./types";

export interface HouseholdServiceOptions {
  now?: () => string;
  stateStore?: PersistentStateStore;
}

export class HouseholdServiceError extends Error {
  readonly code: string;

  readonly hint?: string;

  constructor(code: string, message: string, hint?: string) {
    super(message);
    this.name = "HouseholdServiceError";
    this.code = code;
    this.hint = hint;
  }
}

const assertNonEmpty = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new HouseholdServiceError("INVALID_INPUT", `${field} is required.`);
  }
  return normalized;
};

const sortMembers = (household: HouseholdRecord): HouseholdRecord => ({
  ...household,
  members: [...household.members].sort(
    (left, right) =>
      left.joinedAt.localeCompare(right.joinedAt) || left.userId.localeCompare(right.userId),
  ),
});

const sortInvitations = (invitations: HouseholdInvitation[]): HouseholdInvitation[] =>
  [...invitations].sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) || left.invitationId.localeCompare(right.invitationId),
  );

export class HouseholdService {
  private readonly householdsById = new Map<string, HouseholdRecord>();

  private readonly invitationsById = new Map<string, HouseholdInvitation>();

  private householdSequence = 0;

  private invitationSequence = 0;

  private readonly now: () => string;

  private readonly stateStore?: PersistentStateStore;

  constructor(options?: HouseholdServiceOptions) {
    this.now = options?.now ?? (() => new Date().toISOString());
    this.stateStore = options?.stateStore;

    if (this.stateStore) {
      const persisted = this.stateStore.read();
      for (const household of persisted.households) {
        const normalized = sortMembers(structuredClone(household));
        this.householdsById.set(normalized.householdId, normalized);
        this.householdSequence = Math.max(
          this.householdSequence,
          this.parseSequence(normalized.householdId, "household"),
        );
      }
      for (const invitation of persisted.householdInvitations) {
        const normalized = structuredClone(invitation);
        this.invitationsById.set(normalized.invitationId, normalized);
        this.invitationSequence = Math.max(
          this.invitationSequence,
          this.parseSequence(normalized.invitationId, "invite"),
        );
      }
    }
  }

  bootstrapHousehold(actorUserId: string): HouseholdRecord {
    const actor = assertNonEmpty(actorUserId, "actorUserId");
    const existing = this.findHouseholdByUser(actor);
    if (existing) {
      return structuredClone(sortMembers(existing));
    }

    const createdAt = this.now();
    const household: HouseholdRecord = {
      householdId: this.nextHouseholdId(),
      createdAt,
      updatedAt: createdAt,
      members: [{
        userId: actor,
        role: "head",
        joinedAt: createdAt,
      }],
    };

    this.householdsById.set(household.householdId, household);
    this.persist();
    return structuredClone(sortMembers(household));
  }

  getHouseholdForUser(actorUserId: string): HouseholdRecord | null {
    const actor = assertNonEmpty(actorUserId, "actorUserId");
    const household = this.findHouseholdByUser(actor);
    return household ? structuredClone(sortMembers(household)) : null;
  }

  listPendingInvitationsForUser(actorUserId: string): HouseholdInvitation[] {
    const actor = assertNonEmpty(actorUserId, "actorUserId");
    return sortInvitations(this.listAllInvitations()).filter(
      (invitation) =>
        invitation.invitedUserId === actor && invitation.status === "pending",
    );
  }

  listHouseholdInvitations(householdId: string, actorUserId: string): HouseholdInvitation[] {
    const householdKey = assertNonEmpty(householdId, "householdId");
    const actor = assertNonEmpty(actorUserId, "actorUserId");
    const household = this.requireHousehold(householdKey);
    this.requireHead(household, actor);

    return sortInvitations(this.listAllInvitations()).filter(
      (invitation) => invitation.householdId === household.householdId,
    );
  }

  inviteMember(request: InviteHouseholdMemberRequest): HouseholdInvitation {
    const householdId = assertNonEmpty(request.householdId, "householdId");
    const actorUserId = assertNonEmpty(request.actorUserId, "actorUserId");
    const invitedUserId = assertNonEmpty(request.invitedUserId, "invitedUserId");

    if (actorUserId === invitedUserId) {
      throw new HouseholdServiceError(
        "INVALID_INVITATION",
        "Head user cannot invite itself.",
      );
    }

    const household = this.requireHousehold(householdId);
    this.requireHead(household, actorUserId);

    if (this.isUserInAnyHousehold(invitedUserId)) {
      throw new HouseholdServiceError(
        "USER_ALREADY_IN_HOUSEHOLD",
        "Invited user is already a member of a household.",
      );
    }

    const duplicatePending = this.listAllInvitations().find(
      (entry) =>
        entry.householdId === household.householdId &&
        entry.invitedUserId === invitedUserId &&
        entry.status === "pending",
    );
    if (duplicatePending) {
      throw new HouseholdServiceError(
        "INVITATION_ALREADY_PENDING",
        "Pending invitation already exists for invited user.",
      );
    }

    const invitation: HouseholdInvitation = {
      invitationId: this.nextInvitationId(),
      householdId: household.householdId,
      invitedUserId,
      invitedByUserId: actorUserId,
      status: "pending",
      createdAt: this.now(),
    };

    this.invitationsById.set(invitation.invitationId, invitation);
    this.persist();
    return structuredClone(invitation);
  }

  acceptInvitation(request: AcceptHouseholdInvitationRequest): AcceptHouseholdInvitationResult {
    const invitationId = assertNonEmpty(request.invitationId, "invitationId");
    const actorUserId = assertNonEmpty(request.actorUserId, "actorUserId");
    const invitation = this.requireInvitation(invitationId);

    if (invitation.status !== "pending") {
      throw new HouseholdServiceError(
        "INVITATION_NOT_PENDING",
        "Invitation is no longer pending.",
      );
    }
    if (invitation.invitedUserId !== actorUserId) {
      throw new HouseholdServiceError(
        "INVITATION_FORBIDDEN",
        "Invitation does not belong to current user.",
      );
    }
    if (this.isUserInAnyHousehold(actorUserId)) {
      throw new HouseholdServiceError(
        "USER_ALREADY_IN_HOUSEHOLD",
        "User is already a member of a household.",
      );
    }

    const household = this.requireHousehold(invitation.householdId);
    const acceptedAt = this.now();

    household.members.push({
      userId: actorUserId,
      role: "member",
      joinedAt: acceptedAt,
    });
    household.updatedAt = acceptedAt;

    invitation.status = "accepted";
    invitation.respondedAt = acceptedAt;

    const revokedInvitationIds: string[] = [];
    for (const other of this.invitationsById.values()) {
      if (
        other.invitationId !== invitation.invitationId &&
        other.invitedUserId === actorUserId &&
        other.status === "pending"
      ) {
        other.status = "revoked";
        other.respondedAt = acceptedAt;
        revokedInvitationIds.push(other.invitationId);
      }
    }

    this.persist();

    return {
      household: structuredClone(sortMembers(household)),
      invitation: structuredClone(invitation),
      revokedInvitationIds,
    };
  }

  revokeInvitation(request: RevokeHouseholdInvitationRequest): HouseholdInvitation {
    const invitationId = assertNonEmpty(request.invitationId, "invitationId");
    const householdId = assertNonEmpty(request.householdId, "householdId");
    const actorUserId = assertNonEmpty(request.actorUserId, "actorUserId");

    const household = this.requireHousehold(householdId);
    this.requireHead(household, actorUserId);

    const invitation = this.requireInvitation(invitationId);
    if (invitation.householdId !== household.householdId) {
      throw new HouseholdServiceError(
        "INVITATION_HOUSEHOLD_MISMATCH",
        "Invitation does not belong to household.",
      );
    }
    if (invitation.status !== "pending") {
      throw new HouseholdServiceError(
        "INVITATION_NOT_PENDING",
        "Only pending invitations can be revoked.",
      );
    }

    invitation.status = "revoked";
    invitation.respondedAt = this.now();
    this.persist();
    return structuredClone(invitation);
  }

  private requireHousehold(householdId: string): HouseholdRecord {
    const household = this.householdsById.get(householdId);
    if (!household) {
      throw new HouseholdServiceError(
        "HOUSEHOLD_NOT_FOUND",
        "Household does not exist.",
      );
    }
    return household;
  }

  private requireInvitation(invitationId: string): HouseholdInvitation {
    const invitation = this.invitationsById.get(invitationId);
    if (!invitation) {
      throw new HouseholdServiceError(
        "INVITATION_NOT_FOUND",
        "Invitation does not exist.",
      );
    }
    return invitation;
  }

  private requireHead(household: HouseholdRecord, actorUserId: string): void {
    const member = household.members.find((entry) => entry.userId === actorUserId);
    if (!member || member.role !== "head") {
      throw new HouseholdServiceError(
        "HOUSEHOLD_FORBIDDEN",
        "Household operation requires head role.",
      );
    }
  }

  private findHouseholdByUser(userId: string): HouseholdRecord | null {
    for (const household of this.householdsById.values()) {
      if (household.members.some((member) => member.userId === userId)) {
        return household;
      }
    }
    return null;
  }

  private isUserInAnyHousehold(userId: string): boolean {
    return this.findHouseholdByUser(userId) !== null;
  }

  private listAllInvitations(): HouseholdInvitation[] {
    return Array.from(this.invitationsById.values(), (invitation) =>
      structuredClone(invitation),
    );
  }

  private nextHouseholdId(): string {
    this.householdSequence += 1;
    return `household-${this.householdSequence}`;
  }

  private nextInvitationId(): string {
    this.invitationSequence += 1;
    return `invite-${this.invitationSequence}`;
  }

  private parseSequence(value: string, prefix: "household" | "invite"): number {
    const match = value.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (!match) {
      return 0;
    }
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private persist(): void {
    if (!this.stateStore) {
      return;
    }

    const households = Array.from(this.householdsById.values(), (household) =>
      structuredClone(sortMembers(household)),
    ).sort(
      (left, right) =>
        left.createdAt.localeCompare(right.createdAt) ||
        left.householdId.localeCompare(right.householdId),
    );

    const invitations = sortInvitations(
      Array.from(this.invitationsById.values(), (invitation) =>
        structuredClone(invitation),
      ),
    );

    this.stateStore.update((draft) => {
      draft.households = households;
      draft.householdInvitations = invitations;
    });
  }
}
