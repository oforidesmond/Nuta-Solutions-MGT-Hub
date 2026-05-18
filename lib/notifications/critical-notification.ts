import { toast } from "sonner";
import { notificationToastDescription } from "@/lib/notifications/notification-toast-content";
import type { HubNotification, HubNotificationType } from "@/lib/types/phase2";

/** Mirrors server `hasCritical` / destructive list styling (NOTIFICATIONS_REALTIME §2.5). */
const CRITICAL_TYPES = new Set<HubNotificationType>([
  "SYSTEM_ALERT",
  "PLAN_UPGRADE_REQUIRED",
  "PAYMENT_FAILED",
  "ACCOUNT_SUSPENDED",
  "DATA_BREACH_NOTICE",
  "SECURITY_ALERT",
  "SUSPICIOUS_ACTIVITY",
  "DEVICE_UNAUTHORIZED",
  "BACKUP_FAILED",
  "USAGE_LIMIT_REACHED",
  "SERVICE_MAINTENANCE",
]);

export function isCriticalNotificationType(type: string): boolean {
  return CRITICAL_TYPES.has(type as HubNotificationType);
}

export function toastCriticalNotification(
  title: string,
  message: string,
  attribution?: Pick<HubNotification, "metadata" | "senderName">,
): void {
  const notification = { message, ...attribution };
  toast.info(title, {
    description: notificationToastDescription(notification, message),
  });
}
