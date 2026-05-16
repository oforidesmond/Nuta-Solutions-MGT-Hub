"use client";

import { Badge } from "@/components/ui/badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { isNotificationUnread } from "@/lib/hooks/use-notifications";
import { formatDate } from "@/lib/format";
import { isCriticalNotificationType } from "@/lib/notifications/critical-notification";
import type { HubNotification } from "@/lib/types/phase2";
import { cn } from "@/lib/utils";

interface NotificationMenuItemProps {
  notification: HubNotification;
  onSelect: (notification: HubNotification) => void;
}

export function NotificationMenuItem({ notification, onSelect }: NotificationMenuItemProps) {
  const n = notification;
  const unread = isNotificationUnread(n);
  const isCritical = isCriticalNotificationType(n.type);
  const isAggregated = n.aggregateCount > 1;

  return (
    <DropdownMenuItem
      className={cn(
        "relative flex cursor-pointer flex-col items-start gap-0.5 rounded-md border-l-4 px-3 py-2.5",
        unread && !isCritical && "border-l-primary bg-muted/50",
        unread && isCritical && "border-l-destructive bg-destructive/10",
        !unread && "border-l-transparent",
      )}
      onSelect={(e) => {
        e.preventDefault();
        onSelect(n);
      }}
    >
      {isAggregated ? (
        <Badge
          variant="secondary"
          className="absolute right-2 top-2 h-5 min-w-5 justify-center px-1 text-[0.65rem]"
        >
          {n.aggregateCount}
        </Badge>
      ) : null}
      {n.title ? (
        <span
          className={cn(
            "line-clamp-1 pr-8 text-left text-sm leading-snug text-foreground",
            unread && "font-semibold",
          )}
        >
          {n.title}
        </span>
      ) : null}
      <span
        className={cn(
          "line-clamp-2 text-left text-sm leading-snug",
          n.title ? "pr-8 text-muted-foreground" : "text-foreground",
          !n.title && unread && "font-semibold",
          n.title && "pr-8",
        )}
      >
        {n.message || n.type.replace(/_/g, " ")}
      </span>
      {n.createdAt ? (
        <span className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
      ) : null}
    </DropdownMenuItem>
  );
}
