import { Badge } from "@/components/ui/badge";
import type { PlatformNotification } from "@/lib/types/platform";

/**
 * Broadcast rows (`userId === null`) use per-tenant read receipts; the platform
 * list exposes DB `isRead` on the row, which stays false for org-wide alerts.
 */
export function PlatformNotificationReadBadge({ notification }: { notification: PlatformNotification }) {
  const isBroadcast = notification.userId == null;

  if (isBroadcast) {
    return (
      <Badge
        variant="outline"
        title="Delivered to tenant inboxes; read state is tracked per user on the hub"
      >
        Broadcast
      </Badge>
    );
  }

  return (
    <Badge variant={notification.isRead ? "secondary" : "default"}>
      {notification.isRead ? "Read" : "Unread"}
    </Badge>
  );
}
