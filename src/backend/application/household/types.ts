export type HouseholdMemberRole = "head" | "member";

export type HouseholdInvitationStatus = "pending" | "accepted" | "revoked";

export interface HouseholdMember {
  userId: string;
  role: HouseholdMemberRole;
  joinedAt: string;
  /** Bewaard kcal-voorkeur zodat gezinsaggregatie mogelijk is */
  kcalPreference?: number;
}

export interface HouseholdRecord {
  householdId: string;
  /** Optionele naam die het gezinshoofd kan instellen */
  name?: string;
  createdAt: string;
  updatedAt: string;
  members: HouseholdMember[];
  /** Unieke code om gezinsleden te laten koppelen */
  inviteCode?: string;
}

export interface HouseholdInvitation {
  invitationId: string;
  householdId: string;
  invitedUserId: string;
  invitedByUserId: string;
  status: HouseholdInvitationStatus;
  createdAt: string;
  respondedAt?: string;
}

export interface InviteHouseholdMemberRequest {
  householdId: string;
  actorUserId: string;
  invitedUserId: string;
}

export interface AcceptHouseholdInvitationRequest {
  invitationId: string;
  actorUserId: string;
}

export interface RevokeHouseholdInvitationRequest {
  invitationId: string;
  householdId: string;
  actorUserId: string;
}

export interface AcceptHouseholdInvitationResult {
  household: HouseholdRecord;
  invitation: HouseholdInvitation;
  revokedInvitationIds: string[];
}
