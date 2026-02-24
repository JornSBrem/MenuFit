export type AuditCategory = "admin" | "system" | "matching" | "sync" | "config";
export type AuditOutcome = "success" | "failure" | "dry_run";

export interface AuditEventInput {
  category: AuditCategory;
  action: string;
  resourceId?: string;
  actorId?: string;
  outcome: AuditOutcome;
  details?: Record<string, unknown>;
}

export interface AuditEvent extends AuditEventInput {
  eventId: string;
  createdAt: string;
}

export interface AuditListFilter {
  category?: AuditCategory;
  outcome?: AuditOutcome;
  actorId?: string;
}
