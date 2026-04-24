"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { notificationsListQueryKey, useNotifications } from "@/lib/hooks/use-notifications";
import { markNotificationRead } from "@/lib/api/notifications";
import { resolveNotificationHref } from "@/lib/navigation/notification-href";
import { cn } from "@/lib/utils";

export function NotificationsMenu() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { items, loading, error, reload } = useNotifications();

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...notificationsListQueryKey] });
    },
  });

  const unread = items.filter((n) => n.read !== true).length;

  return (
    <DropdownMenu onOpenChange={(open) => open && void reload()}>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative shrink-0"
            aria-label="Notifications"
          />
        }
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          <span
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground"
            aria-hidden
          >
            {unread > 9 ? "9+" : unread}
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
            <div className="p-3 text-sm text-muted-foreground">
              Could not load notifications.
            </div>
          ) : items.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </div>
          ) : (
            <ScrollArea className="max-h-[min(70vh,320px)]">
              <div className="p-1">
                {items.map((n) => {
                  const href = resolveNotificationHref(n);
                  const isUnread = n.read !== true;
                  return (
                    <DropdownMenuItem
                      key={n.id}
                      className={cn(
                        "flex cursor-pointer flex-col items-start gap-0.5 rounded-md px-3 py-2.5",
                        isUnread && "bg-muted/50",
                      )}
                      onSelect={async (e) => {
                        e.preventDefault();
                        if (n.id && isUnread) {
                          try {
                            await markReadMutation.mutateAsync(n.id);
                          } catch {
                            toast.error("Could not mark notification read.");
                          }
                        }
                        if (!href) {
                          toast.info("This notification has no link yet.");
                          return;
                        }
                        router.push(href);
                      }}
                    >
                      <span className="line-clamp-2 text-left text-sm leading-snug text-foreground">
                        {n.message || n.title || n.type.replace(/_/g, " ")}
                      </span>
                      {n.createdAt ? (
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      ) : null}
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
