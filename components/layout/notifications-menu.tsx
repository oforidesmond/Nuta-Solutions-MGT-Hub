"use client";

import { useState } from "react";
import { Bell, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NotificationMenuItem } from "@/components/layout/notification-menu-item";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  isNotificationUnread,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from "@/lib/hooks/use-notifications";
import { resolveNotificationHref } from "@/lib/navigation/notification-href";
import type { HubNotification } from "@/lib/types/phase2";
import { cn } from "@/lib/utils";

export function NotificationsMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { items, loading, error, reload } = useNotifications();
  const unreadQuery = useUnreadCount();
  const markReadMutation = useMarkNotificationRead();

  const unreadCount = unreadQuery.data?.unreadCount ?? 0;
  const hasCritical = unreadQuery.data?.hasCritical ?? false;
  const badgeRefreshing = unreadQuery.isFetching && !unreadQuery.isPending;

  function handleNotificationClick(notification: HubNotification) {
    const href = resolveNotificationHref(notification);
    const unread = isNotificationUnread(notification);

    if (unread && notification.id) {
      markReadMutation.mutate(notification.id);
    }

    setOpen(false);

    if (href) {
      router.push(href);
      return;
    }

    if (notification.type === "STOCK_VARIANCE_SALE") {
      const receipt =
        typeof notification.metadata?.receiptNumber === "string"
          ? notification.metadata.receiptNumber
          : null;
      toast.info(
        receipt
          ? `Open Sales to find receipt ${receipt}.`
          : "Open Sales to find this variance receipt.",
      );
      router.push("/sales");
      return;
    }

    toast.info(notification.title || "Notification", {
      description: notification.message || undefined,
    });
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
      <DropdownMenuContent align="end" className="w-[min(100vw-2rem,22rem)] p-0">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-3 py-2 text-sm font-medium text-foreground">
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
            <div className="p-4 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </div>
          ) : (
            <ScrollArea className="max-h-[min(70vh,320px)]">
              <div className="p-1">
                {items.map((n) => (
                  <NotificationMenuItem
                    key={n.id}
                    notification={n}
                    onSelect={handleNotificationClick}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
