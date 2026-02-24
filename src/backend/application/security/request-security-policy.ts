import type { OperationalTelemetryService } from "../observability/operational-telemetry-service.ts";
import type { SecurityEventType } from "../observability/types.ts";

export interface SecurityDenyError {
  code: "FORBIDDEN_ROLE" | "RATE_LIMITED" | "WAF_BLOCKED";
  message: string;
  hint?: string;
}

interface RequestSecurityPolicyOptions {
  telemetry?: OperationalTelemetryService;
  nowEpochSeconds?: () => number;
  rateLimitWindowSeconds?: number;
  rateLimitMaxRequests?: number;
  blockedPayloadPatterns?: RegExp[];
}

const DEFAULT_BLOCKED_PATTERNS = [
  /<script\b/i,
  /\bselect\b\s+.*\bfrom\b/i,
  /\bunion\b\s+select\b/i,
  /\bdrop\s+table\b/i,
  /javascript:/i,
  /onerror\s*=/i,
];

const ownerOnly = (requiredRole: "operator" | "owner", actorRole: "operator" | "owner"): boolean =>
  requiredRole === "operator" || actorRole === "owner";

const toSecurityEventType = (code: SecurityDenyError["code"]): SecurityEventType =>
  code === "FORBIDDEN_ROLE" ? "rbac_forbidden" : code === "RATE_LIMITED" ? "rate_limited" : "waf_blocked";

export class RequestSecurityPolicy {
  private readonly telemetry?: OperationalTelemetryService;

  private readonly nowEpochSeconds: () => number;

  private readonly rateLimitWindowSeconds: number;

  private readonly rateLimitMaxRequests: number;

  private readonly blockedPayloadPatterns: RegExp[];

  private readonly timestampsByRouteActor = new Map<string, number[]>();

  constructor(options?: RequestSecurityPolicyOptions) {
    this.telemetry = options?.telemetry;
    this.nowEpochSeconds = options?.nowEpochSeconds ?? (() => Math.floor(Date.now() / 1000));
    this.rateLimitWindowSeconds = options?.rateLimitWindowSeconds ?? 60;
    this.rateLimitMaxRequests = options?.rateLimitMaxRequests ?? 20;
    this.blockedPayloadPatterns = options?.blockedPayloadPatterns ?? DEFAULT_BLOCKED_PATTERNS;
  }

  authorize(input: {
    routeKey: string;
    actorId: string;
    actorRole: "operator" | "owner";
    requiredRole: "operator" | "owner";
    payload?: unknown;
  }): { ok: true } | { ok: false; error: SecurityDenyError } {
    if (!ownerOnly(input.requiredRole, input.actorRole)) {
      return this.deny(input.routeKey, {
        code: "FORBIDDEN_ROLE",
        message: "Admin role is not allowed for this route.",
        hint: "Use owner role for this operation.",
      });
    }

    if (this.containsBlockedPayload(input.payload)) {
      return this.deny(input.routeKey, {
        code: "WAF_BLOCKED",
        message: "Request blocked by WAF policy.",
        hint: "Payload contains blocked patterns.",
      });
    }

    if (!this.allowRate(input.routeKey, input.actorId)) {
      return this.deny(input.routeKey, {
        code: "RATE_LIMITED",
        message: "Rate limit exceeded for route.",
        hint: "Retry after cooldown window.",
      });
    }

    return { ok: true };
  }

  private deny(
    routeKey: string,
    error: SecurityDenyError,
  ): { ok: false; error: SecurityDenyError } {
    this.telemetry?.recordSecurityEvent({
      routeKey,
      eventType: toSecurityEventType(error.code),
    });
    return { ok: false, error };
  }

  private allowRate(routeKey: string, actorId: string): boolean {
    const now = this.nowEpochSeconds();
    const windowStart = now - this.rateLimitWindowSeconds;
    const key = `${routeKey}::${actorId}`;
    const existing = this.timestampsByRouteActor.get(key) ?? [];
    const inWindow = existing.filter((timestamp) => timestamp > windowStart);
    if (inWindow.length >= this.rateLimitMaxRequests) {
      this.timestampsByRouteActor.set(key, inWindow);
      return false;
    }
    inWindow.push(now);
    this.timestampsByRouteActor.set(key, inWindow);
    return true;
  }

  private containsBlockedPayload(payload: unknown): boolean {
    if (payload === null || payload === undefined) {
      return false;
    }

    if (typeof payload === "string") {
      return this.blockedPayloadPatterns.some((pattern) => pattern.test(payload));
    }

    if (typeof payload === "number" || typeof payload === "boolean") {
      return false;
    }

    if (Array.isArray(payload)) {
      return payload.some((entry) => this.containsBlockedPayload(entry));
    }

    if (typeof payload === "object") {
      return Object.values(payload as Record<string, unknown>).some((value) => this.containsBlockedPayload(value));
    }

    return false;
  }
}
