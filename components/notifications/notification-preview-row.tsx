"use client";

import { Badge } from "@/components/ui/badge";
import { PlatformSupportSenderLabel } from "@/components/notifications/platform-support-sender-label";
import { isNotificationUnread } from "@/lib/hooks/use-notifications";
import { formatDate } from "@/lib/format";
import { isCriticalNotificationType } from "@/lib/notifications/critical-notification";
import { isPlatformSupportNotification } from "@/lib/notifications/platform-support-notification";
import type { HubNotification } from "@/lib/types/phase2";
import { cn } from "@/lib/utils";

interface NotificationPreviewRowProps {
  notification: HubNotification;
  className?: string;
}

/** Truncated preview (title + 2-line message) for dropdown and inbox list. */
export function NotificationPreviewRow({ notification: n, className }: NotificationPreviewRowProps) {
  const unread = isNotificationUnread(n);
  const isCritical = isCriticalNotificationType(n.type);
  const fromPlatformSupport = isPlatformSupportNotification(n);
  const isAggregated = (n.aggregateCount ?? 1) > 1;
  const showDestructive = unread && isCritical && !fromPlatformSupport;

  return (
    <div className={cn("relative flex w-full min-w-0 max-w-full gap-2.5 overflow-hidden", className)}>
      <div className="flex w-2.5 shrink-0 justify-center pt-[0.35rem]" aria-hidden>
        <span
          className={cn(
            "shrink-0 rounded-full transition-all duration-200 ease-out",
            unread && !isCritical && "size-2 scale-100 bg-primary opacity-100",
            unread &&
              fromPlatformSupport &&
              "size-2 scale-100 bg-primary opacity-100 ring-2 ring-primary/30",
            showDestructive &&
              "size-2.5 scale-100 bg-destructive opacity-100 ring-2 ring-destructive/25",
            !unread && "size-2 scale-75 opacity-0",
            !unread && isCritical && "bg-destructive",
            !unread && !isCritical && "bg-primary",
          )}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        {isAggregated ? (
          <Badge
            variant="secondary"
            className="absolute right-2 top-2 h-5 min-w-5 justify-center px-1 text-[0.65rem]"
          >
            {n.aggregateCount ?? 1}
          </Badge>
        ) : null}

        {fromPlatformSupport ? (
          <PlatformSupportSenderLabel variant="compact" className="max-w-full" />
        ) : null}

        {n.title ? (
          <span
            className={cn(
              "line-clamp-1 w-full break-words pr-8 text-left text-sm leading-snug [overflow-wrap:anywhere] transition-[font-weight,color] duration-200",
              unread && !isCritical && "font-semibold text-foreground",
              unread && isCritical && !fromPlatformSupport && "font-semibold text-destructive",
              unread && fromPlatformSupport && "font-semibold text-foreground",
              !unread && "font-normal text-foreground",
            )}
          >
            {n.title}
          </span>
        ) : null}
        <span
          className={cn(
            "line-clamp-2 w-full break-words text-left text-sm leading-snug [overflow-wrap:anywhere] transition-colors duration-200",
            "pr-8",
            n.title && unread && !isCritical && "text-slate-700 dark:text-slate-300",
            n.title && unread && isCritical && !fromPlatformSupport && "text-destructive/90",
            n.title && unread && fromPlatformSupport && "text-slate-700 dark:text-slate-300",
            n.title && !unread && "text-muted-foreground",
            !n.title && unread && !isCritical && "font-semibold text-slate-700 dark:text-slate-300",
            !n.title &&
              unread &&
              isCritical &&
              !fromPlatformSupport &&
              "font-semibold text-destructive/90",
            !n.title && unread && fromPlatformSupport && "font-semibold text-slate-700 dark:text-slate-300",
            !n.title && !unread && "font-normal text-muted-foreground",
          )}
        >
          {n.message || n.type.replace(/_/g, " ")}
        </span>
        <span className="flex w-full flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {n.createdAt ? <span>{formatDate(n.createdAt)}</span> : null}
          {n.branchName ? (
            <>
              {n.createdAt ? <span aria-hidden>·</span> : null}
              <span>{n.branchName}</span>
            </>
          ) : n.branchId === null ? (
            <>
              {n.createdAt ? <span aria-hidden>·</span> : null}
              <span>Org-wide</span>
            </>
          ) : null}
        </span>
      </div>
    </div>
  );
}

export function notificationPreviewRowClassName(n: HubNotification): string {
  const unread = isNotificationUnread(n);
  const isCritical = isCriticalNotificationType(n.type);
  const fromPlatformSupport = isPlatformSupportNotification(n);
  const showDestructive = unread && isCritical && !fromPlatformSupport;

  return cn(
    "relative w-full min-w-0 max-w-full cursor-pointer overflow-hidden rounded-md px-3 py-2.5 text-left transition-colors duration-200 ease-out",
    "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    unread && !isCritical && !fromPlatformSupport && "bg-primary/5 hover:bg-primary/10",
    unread &&
      fromPlatformSupport &&
      "bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent hover:from-primary/[0.12]",
    showDestructive && "bg-destructive/10 hover:bg-destructive/15",
  );
}
