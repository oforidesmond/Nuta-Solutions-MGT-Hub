import type { UserRole } from "@/lib/types/domain";

/** ADMIN/MANAGER may send staff notifications and view the sent outbox. */
export function canSendStaffNotifications(role: UserRole | undefined): boolean {
  return role === "ADMIN" || role === "MANAGER";
}
