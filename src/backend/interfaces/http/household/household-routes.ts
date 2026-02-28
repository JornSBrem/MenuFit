import {
  HouseholdServiceError,
  type HouseholdService,
} from "../../../application/household/household-service.ts";
import type {
  AcceptHouseholdInvitationResult,
  HouseholdInvitation,
  HouseholdRecord,
} from "../../../application/household/types.ts";
import {
  type AnySessionContext,
  SessionContextError,
} from "../auth/session-context.ts";

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    hint?: string;
  };
}

export interface HouseholdStatusResponse {
  household: HouseholdRecord | null;
  pendingInvitations: HouseholdInvitation[];
}

export interface HouseholdInviteBody {
  householdId: string;
  invitedUserId: string;
}

export interface HouseholdAcceptBody {
  invitationId: string;
}

export interface HouseholdRevokeBody {
  householdId: string;
  invitationId: string;
}

export interface HouseholdInvitationsQuery {
  householdId: string;
}

const invalidBody = (hint: string): ApiEnvelope<never> => ({
  ok: false,
  error: {
    code: "INVALID_BODY",
    message: "Request body is invalid.",
    hint,
  },
});

const forbidden = (error: SessionContextError): ApiEnvelope<never> => ({
  ok: false,
  error: {
    code: error.code,
    message: error.message,
    hint: error.hint,
  },
});

const serviceError = (error: HouseholdServiceError): ApiEnvelope<never> => ({
  ok: false,
  error: {
    code: error.code,
    message: error.message,
    hint: error.hint,
  },
});

/** Accepts both user and admin sessions — household routes only need subjectId. */
const withAuthenticatedSession = (
  session: AnySessionContext,
): ApiEnvelope<AnySessionContext> => {
  if (!session.subjectId) {
    return {
      ok: false,
      error: {
        code: "FORBIDDEN_SESSION",
        message: "Route requires an authenticated session.",
      },
    };
  }
  return { ok: true, data: session };
};

const validateInviteBody = (body: HouseholdInviteBody): string | null => {
  if (!body.householdId?.trim()) {
    return "householdId is required";
  }
  if (!body.invitedUserId?.trim()) {
    return "invitedUserId is required";
  }
  return null;
};

const validateAcceptBody = (body: HouseholdAcceptBody): string | null => {
  if (!body.invitationId?.trim()) {
    return "invitationId is required";
  }
  return null;
};

const validateRevokeBody = (body: HouseholdRevokeBody): string | null => {
  if (!body.householdId?.trim()) {
    return "householdId is required";
  }
  if (!body.invitationId?.trim()) {
    return "invitationId is required";
  }
  return null;
};

const validateInvitationsQuery = (query: HouseholdInvitationsQuery): string | null => {
  if (!query.householdId?.trim()) {
    return "householdId is required";
  }
  return null;
};

const toStatusResponse = (
  service: HouseholdService,
  subjectId: string,
): HouseholdStatusResponse => ({
  household: service.getHouseholdForUser(subjectId),
  pendingInvitations: service.listPendingInvitationsForUser(subjectId),
});

export const handleHouseholdBootstrap = (
  service: HouseholdService,
  session: AnySessionContext,
): ApiEnvelope<HouseholdStatusResponse> => {
  const sessionResult = withAuthenticatedSession(session);
  if (!sessionResult.ok || !sessionResult.data) {
    return sessionResult;
  }

  service.bootstrapHousehold(sessionResult.data.subjectId);
  return {
    ok: true,
    data: toStatusResponse(service, sessionResult.data.subjectId),
  };
};

export const handleHouseholdStatus = (
  service: HouseholdService,
  session: AnySessionContext,
): ApiEnvelope<HouseholdStatusResponse> => {
  const sessionResult = withAuthenticatedSession(session);
  if (!sessionResult.ok || !sessionResult.data) {
    return sessionResult;
  }

  return {
    ok: true,
    data: toStatusResponse(service, sessionResult.data.subjectId),
  };
};

export const handleHouseholdInvite = (
  service: HouseholdService,
  session: AnySessionContext,
  body: HouseholdInviteBody,
): ApiEnvelope<HouseholdInvitation> => {
  const sessionResult = withAuthenticatedSession(session);
  if (!sessionResult.ok || !sessionResult.data) {
    return sessionResult;
  }

  const validationError = validateInviteBody(body);
  if (validationError) {
    return invalidBody(validationError);
  }

  try {
    const invitation = service.inviteMember({
      householdId: body.householdId,
      actorUserId: sessionResult.data.subjectId,
      invitedUserId: body.invitedUserId,
    });
    return {
      ok: true,
      data: invitation,
    };
  } catch (error) {
    if (error instanceof HouseholdServiceError) {
      return serviceError(error);
    }
    return {
      ok: false,
      error: {
        code: "HOUSEHOLD_INVITE_ERROR",
        message: "Unexpected household invite failure.",
      },
    };
  }
};

export const handleHouseholdAccept = (
  service: HouseholdService,
  session: AnySessionContext,
  body: HouseholdAcceptBody,
): ApiEnvelope<AcceptHouseholdInvitationResult> => {
  const sessionResult = withAuthenticatedSession(session);
  if (!sessionResult.ok || !sessionResult.data) {
    return sessionResult;
  }

  const validationError = validateAcceptBody(body);
  if (validationError) {
    return invalidBody(validationError);
  }

  try {
    const accepted = service.acceptInvitation({
      invitationId: body.invitationId,
      actorUserId: sessionResult.data.subjectId,
    });
    return {
      ok: true,
      data: accepted,
    };
  } catch (error) {
    if (error instanceof HouseholdServiceError) {
      return serviceError(error);
    }
    return {
      ok: false,
      error: {
        code: "HOUSEHOLD_ACCEPT_ERROR",
        message: "Unexpected household accept failure.",
      },
    };
  }
};

export const handleHouseholdRevoke = (
  service: HouseholdService,
  session: AnySessionContext,
  body: HouseholdRevokeBody,
): ApiEnvelope<HouseholdInvitation> => {
  const sessionResult = withAuthenticatedSession(session);
  if (!sessionResult.ok || !sessionResult.data) {
    return sessionResult;
  }

  const validationError = validateRevokeBody(body);
  if (validationError) {
    return invalidBody(validationError);
  }

  try {
    const revoked = service.revokeInvitation({
      invitationId: body.invitationId,
      householdId: body.householdId,
      actorUserId: sessionResult.data.subjectId,
    });
    return {
      ok: true,
      data: revoked,
    };
  } catch (error) {
    if (error instanceof HouseholdServiceError) {
      return serviceError(error);
    }
    return {
      ok: false,
      error: {
        code: "HOUSEHOLD_REVOKE_ERROR",
        message: "Unexpected household revoke failure.",
      },
    };
  }
};

export const handleHouseholdInvitations = (
  service: HouseholdService,
  session: AnySessionContext,
  query: HouseholdInvitationsQuery,
): ApiEnvelope<HouseholdInvitation[]> => {
  const sessionResult = withAuthenticatedSession(session);
  if (!sessionResult.ok || !sessionResult.data) {
    return sessionResult;
  }

  const validationError = validateInvitationsQuery(query);
  if (validationError) {
    return invalidBody(validationError);
  }

  try {
    const invitations = service.listHouseholdInvitations(
      query.householdId,
      sessionResult.data.subjectId,
    );
    return {
      ok: true,
      data: invitations,
    };
  } catch (error) {
    if (error instanceof HouseholdServiceError) {
      return serviceError(error);
    }
    return {
      ok: false,
      error: {
        code: "HOUSEHOLD_INVITATIONS_ERROR",
        message: "Unexpected household invitations failure.",
      },
    };
  }
};

export interface HouseholdRouteHandlers {
  bootstrap: (session: AnySessionContext) => ApiEnvelope<HouseholdStatusResponse>;
  me: (session: AnySessionContext) => ApiEnvelope<HouseholdStatusResponse>;
  invite: (
    session: AnySessionContext,
    body: HouseholdInviteBody,
  ) => ApiEnvelope<HouseholdInvitation>;
  accept: (
    session: AnySessionContext,
    body: HouseholdAcceptBody,
  ) => ApiEnvelope<AcceptHouseholdInvitationResult>;
  revoke: (
    session: AnySessionContext,
    body: HouseholdRevokeBody,
  ) => ApiEnvelope<HouseholdInvitation>;
  invitations: (
    session: AnySessionContext,
    query: HouseholdInvitationsQuery,
  ) => ApiEnvelope<HouseholdInvitation[]>;
}

export const createHouseholdRouteHandlers = (
  service: HouseholdService,
): HouseholdRouteHandlers => ({
  bootstrap: (session) => handleHouseholdBootstrap(service, session),
  me: (session) => handleHouseholdStatus(service, session),
  invite: (session, body) => handleHouseholdInvite(service, session, body),
  accept: (session, body) => handleHouseholdAccept(service, session, body),
  revoke: (session, body) => handleHouseholdRevoke(service, session, body),
  invitations: (session, query) =>
    handleHouseholdInvitations(service, session, query),
});
