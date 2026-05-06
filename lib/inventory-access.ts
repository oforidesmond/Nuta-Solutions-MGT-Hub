import type { UserRole } from "@/lib/types/domain";

/** Matches `@Roles` on inventory stock-take routes (ADMIN, MANAGER). */
export function canManageStockTakes(role: UserRole | undefined): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

/** Product conversions CRUD + bulk convert (ADMIN, MANAGER). */
export function canManageInventoryConversions(role: UserRole | undefined): boolean {
  return role === "ADMIN" || role === "MANAGER";
}
