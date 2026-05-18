import { Badge } from "@/components/ui/badge";
import type { SentNotification } from "@/lib/types/phase2";

export function SentNotificationReadBadge({ notification }: { notification: SentNotification }) {
  return (
    <Badge variant={notification.isRead ? "secondary" : "default"}>
      {notification.isRead ? "Read" : "Unread"}
    </Badge>
  );
}
