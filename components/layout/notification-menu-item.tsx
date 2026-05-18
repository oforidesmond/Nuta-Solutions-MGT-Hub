"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  NotificationPreviewRow,
  notificationPreviewRowClassName,
} from "@/components/notifications/notification-preview-row";
import type { HubNotification } from "@/lib/types/phase2";

interface NotificationMenuItemProps {
  notification: HubNotification;
  onSelect: (notification: HubNotification) => void;
}

export function NotificationMenuItem({ notification, onSelect }: NotificationMenuItemProps) {
  return (
    <DropdownMenuItem
      className={notificationPreviewRowClassName(notification)}
      onClick={() => onSelect(notification)}
    >
      <NotificationPreviewRow notification={notification} />
    </DropdownMenuItem>
  );
}
