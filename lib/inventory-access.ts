import type { UserRole } from "@/lib/types/domain";

/** Matches `@Roles` on inventory stock-take routes (ADMIN, MANAGER). */
export function canManageStockTakes(role: UserRole | undefined): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

/** Product conversions CRUD + bulk convert (ADMIN, MANAGER). */
export function canManageInventoryConversions(role: UserRole | undefined): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

/**
 * Product lifecycle ledger + insights (GET /products/:id/lifecycle, /insights/*).
 * Hub is ADMIN-first; API also allows MANAGER.
 */
export function canViewProductLifecycle(role: UserRole | undefined): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

/** Void sale in hub — ADMIN only (API also allows MANAGER). */
export function canVoidSale(role: UserRole | undefined): boolean {
  return role === "ADMIN";
}
