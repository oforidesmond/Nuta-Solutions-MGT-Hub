import { toast } from "sonner";
import type { HubNotificationType } from "@/lib/types/phase2";

const CRITICAL_TYPES = new Set<HubNotificationType>(["SYSTEM_ALERT", "PLAN_UPGRADE_REQUIRED"]);

export function isCriticalNotificationType(type: string): boolean {
  return CRITICAL_TYPES.has(type as HubNotificationType);
}

export function toastCriticalNotification(title: string, message: string): void {
  toast.info(title, { description: message });
}
