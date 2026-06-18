import type { UserRole } from "@/lib/types/domain";

/** Branch creation is ADMIN-only (POST /branches). */
export function canCreateBranch(role: UserRole | undefined): boolean {
  return role === "ADMIN";
}

/** ADMIN and MANAGER can view and update branches (PATCH /branches/:id). */
export function canManageBranches(role: UserRole | undefined): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

/** Stock transfer is ADMIN-only (POST /inventory/transfer). */
export function canTransferStock(role: UserRole | undefined): boolean {
  return role === "ADMIN";
}

/** Org-wide analytics command center is ADMIN-only (GET /analytics/org/*). */
export function canViewOrgAnalytics(role: UserRole | undefined): boolean {
  return role === "ADMIN";
}
