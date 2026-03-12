import type { AdminRole } from "./types.ts";

/**
 * Canonical admin role resolution from JWT/OIDC claims.
 *
 * Claim priority (first match wins):
 *   1. app_metadata.role  — Supabase-native, set via dashboard or edge function
 *   2. menufit:role       — namespaced custom claim (OIDC/OAuth)
 *   3. roles              — generic array/string claim
 *   4. role               — direct claim (legacy)
 *
 * Returns null when no admin role is present in the claims.
 */
export function resolveAdminRoleFromClaims(claims: Record<string, unknown>): AdminRole | null {
  const appMetadata = claims.app_metadata as Record<string, unknown> | undefined;
  const appMetadataRole = appMetadata && typeof appMetadata.role === "string"
    ? appMetadata.role
    : undefined;

  const namespacedRole = typeof claims["menufit:role"] === "string"
    ? claims["menufit:role"]
    : undefined;

  const genericRoles: unknown = claims["roles"] ?? null;

  const directRole = typeof claims.role === "string"
    ? claims.role
    : undefined;

  // Single-value sources in priority order
  for (const raw of [appMetadataRole, namespacedRole, directRole]) {
    if (raw !== undefined) {
      const normalized = raw.toLowerCase();
      if (normalized === "owner") return "owner";
      if (normalized === "operator") return "operator";
    }
  }

  // Array source (roles claim)
  if (Array.isArray(genericRoles)) {
    if (genericRoles.includes("owner")) return "owner";
    if (genericRoles.includes("operator")) return "operator";
  } else if (typeof genericRoles === "string") {
    const normalized = genericRoles.toLowerCase();
    if (normalized === "owner") return "owner";
    if (normalized === "operator") return "operator";
  }

  return null;
}
