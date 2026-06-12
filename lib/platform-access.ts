import type { HubUser } from "@/lib/types/domain";

/**
 * SUPER_ADMIN identification mirrors the backend `SuperAdminGuard` contract:
 * the user must have the SUPER_ADMIN role AND no organizationId. A
 * SUPER_ADMIN token that carries an organizationId is treated as
 * misconfigured (defense in depth - backend rejects it with 403).
 */
export function isPlatformAdmin(user: HubUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role !== "SUPER_ADMIN") return false;
  return !user.organizationId;
}

/**
 * Where a freshly authenticated user should land. SUPER_ADMINs go to the
 * platform console, tenant users (ADMIN / MANAGER / STAFF / SALES_AGENT) go
 * to the management hub home.
 */
export function postLoginRedirect(
  user: HubUser | null | undefined,
): "/platform" | "/" {
  return isPlatformAdmin(user) ? "/platform" : "/";
}
