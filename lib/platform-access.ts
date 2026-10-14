import { userNeedsPasswordChange } from "@/lib/auth/password-change";
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
 * Where a freshly authenticated user should land.
 * Temporary-password users must set a permanent password first.
 * SUPER_ADMINs go to the platform console; tenant users go to the hub home.
 */
export function postLoginRedirect(
  user: HubUser | null | undefined,
): "/change-password" | "/platform" | "/" {
  if (userNeedsPasswordChange(user)) return "/change-password";
  return isPlatformAdmin(user) ? "/platform" : "/";
}
