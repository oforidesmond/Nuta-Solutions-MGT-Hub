"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  NotificationPreviewRow,
  notificationPreviewRowClassName,
} from "@/components/notifications/notification-preview-row";
import type { HubNotification } from "@/lib/types/phase2";
import { cn } from "@/lib/utils";

interface NotificationMenuItemProps {
  notification: HubNotification;
  onSelect: (notification: HubNotification) => void;
}

export function NotificationMenuItem({ notification, onSelect }: NotificationMenuItemProps) {
  return (
    <DropdownMenuItem
      className={cn(
        notificationPreviewRowClassName(notification),
        "min-w-0 max-w-full w-full items-start overflow-hidden",
      )}
      onClick={() => onSelect(notification)}
    >
      <NotificationPreviewRow notification={notification} />
    </DropdownMenuItem>
  );
}
