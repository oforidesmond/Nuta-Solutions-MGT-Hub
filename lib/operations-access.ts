import type { UserRole } from "@/lib/types/domain";

/** Matches backend `@Roles` on reliability routes (tenant-scoped); SUPER_ADMIN without org gets 403. */
export function canViewStaffReliability(role: UserRole | undefined): boolean {
  return role === "ADMIN" || role === "MANAGER";
}
