"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight, RotateCw } from "lucide-react";
import { NotificationMenuItem } from "@/components/layout/notification-menu-item";
import { useNotificationDetailOpener } from "@/components/notifications/notifications-detail-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useNotifications,
  useUnreadCount,
} from "@/lib/hooks/use-notifications";
import type { HubNotification } from "@/lib/types/phase2";
import { cn } from "@/lib/utils";

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const { items, loading, error, reload } = useNotifications();
  const unreadQuery = useUnreadCount();
  const { openDetail } = useNotificationDetailOpener();

  const unreadCount = unreadQuery.data?.unreadCount ?? 0;
  const hasCritical = unreadQuery.data?.hasCritical ?? false;
  const badgeRefreshing = unreadQuery.isFetching && !unreadQuery.isPending;

  function handleOpenDetail(notification: HubNotification) {
    openDetail(notification);
    setOpen(false);
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void reload();
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "relative shrink-0",
              badgeRefreshing && "opacity-60",
            )}
            aria-label="Notifications"
          />
        }
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span
            className={cn(
              "absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium",
              hasCritical
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground",
            )}
            aria-hidden
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(100vw-2rem,22rem)] overflow-hidden p-0"
      >
        <DropdownMenuGroup className="max-h-[min(50vh,300px)] overflow-y-auto overscroll-contain">
          <DropdownMenuLabel className="px-3 py-2.5 text-sm font-medium text-foreground">
            Notifications
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {loading ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="space-y-3 p-4">
              <p className="text-sm text-muted-foreground">Could not load notifications.</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => void reload()}
              >
                <RotateCw className="mr-2 size-4" aria-hidden />
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </div>
          ) : (
            <div className="p-1">
              {items.map((n) => (
                <NotificationMenuItem
                  key={n.id}
                  notification={n}
                  onSelect={handleOpenDetail}
                />
              ))}
            </div>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <div className="border-t border-border/40 p-1">
          <Link
            href="/notifications/inbox"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            View all notifications
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
