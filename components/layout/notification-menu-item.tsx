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
  const showDestructive = unread && isCritical;

  return (
    <DropdownMenuItem
      className={cn(
        "relative cursor-pointer rounded-md px-3 py-2.5 transition-colors duration-200 ease-out",
        "focus:bg-accent focus:text-accent-foreground",
        unread && !isCritical && "bg-primary/5 focus:bg-primary/10",
        showDestructive && "bg-destructive/10 focus:bg-destructive/15",
      )}
      onClick={() => onSelect(n)}
    >
      <div className="flex w-full gap-2.5">
        <div className="flex w-2.5 shrink-0 justify-center pt-[0.35rem]" aria-hidden>
          <span
            className={cn(
              "shrink-0 rounded-full transition-all duration-200 ease-out",
              unread && !isCritical && "size-2 scale-100 bg-primary opacity-100",
              showDestructive &&
                "size-2.5 scale-100 bg-destructive opacity-100 ring-2 ring-destructive/25",
              !unread && "size-2 scale-75 opacity-0",
              !unread && isCritical && "bg-destructive",
              !unread && !isCritical && "bg-primary",
            )}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
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
                "line-clamp-1 pr-8 text-left text-sm leading-snug transition-[font-weight,color] duration-200",
                unread && !isCritical && "font-semibold text-foreground",
                unread && isCritical && "font-semibold text-destructive",
                !unread && "font-normal text-foreground",
              )}
            >
              {n.title}
            </span>
          ) : null}
          <span
            className={cn(
              "line-clamp-2 text-left text-sm leading-snug transition-colors duration-200",
              "pr-8",
              n.title && unread && !isCritical && "text-slate-700 dark:text-slate-300",
              n.title && unread && isCritical && "text-destructive/90",
              n.title && !unread && "text-muted-foreground",
              !n.title && unread && !isCritical && "font-semibold text-slate-700 dark:text-slate-300",
              !n.title && unread && isCritical && "font-semibold text-destructive/90",
              !n.title && !unread && "font-normal text-muted-foreground",
            )}
          >
            {n.message || n.type.replace(/_/g, " ")}
          </span>
          {n.createdAt ? (
            <span className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
          ) : null}
        </div>
      </div>
    </DropdownMenuItem>
  );
}
