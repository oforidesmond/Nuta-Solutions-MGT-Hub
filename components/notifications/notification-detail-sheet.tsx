"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check } from "lucide-react";
import { PlatformSupportSenderLabel } from "@/components/notifications/platform-support-sender-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDate } from "@/lib/format";
import { isNotificationUnread, useMarkNotificationRead } from "@/lib/hooks/use-notifications";
import { isCriticalNotificationType } from "@/lib/notifications/critical-notification";
import {
  displayNotificationType,
  hubManualSenderDisplayName,
  resolveNotificationAction,
} from "@/lib/navigation/notification-actions";
import { isPlatformSupportNotification } from "@/lib/notifications/platform-support-notification";
import type { HubNotification } from "@/lib/types/phase2";
import { cn } from "@/lib/utils";

export interface NotificationDetailSheetProps {
  notification: HubNotification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after navigation so parents can close dropdowns, etc. */
  onAfterNavigate?: () => void;
}

export function NotificationDetailSheet({
  notification,
  open,
  onOpenChange,
  onAfterNavigate,
}: NotificationDetailSheetProps) {
  const router = useRouter();
  const { mutate: markRead } = useMarkNotificationRead();
  const markedOnOpenRef = useRef<string | null>(null);
  const n = notification;

  useEffect(() => {
    if (!open) {
      markedOnOpenRef.current = null;
      return;
    }
    if (!n?.id || markedOnOpenRef.current === n.id) return;
    markedOnOpenRef.current = n.id;
    if (isNotificationUnread(n)) {
      markRead(n.id);
    }
  }, [open, n?.id, n?.isRead, n?.read, markRead]);

  if (!n) {
    return null;
  }

  const fromPlatform = isPlatformSupportNotification(n);
  const staffSender = hubManualSenderDisplayName(n);
  const isCritical = isCriticalNotificationType(n.type);
  const action = resolveNotificationAction(n);
  const unread = isNotificationUnread(n);
  const body = n.message?.trim() || displayNotificationType(n);

  function handlePrimary() {
    if (!action) return;
    onOpenChange(false);
    onAfterNavigate?.();
    router.push(action.href);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[min(92vh,40rem)] flex-col gap-0 rounded-t-2xl px-0 pb-0 sm:mx-auto sm:max-w-lg"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25" aria-hidden />

        <SheetHeader className="space-y-3 border-b border-border/40 px-4 pb-4 pt-2 text-left">
          <div className="flex flex-wrap items-center gap-2">
            {fromPlatform ? (
              <PlatformSupportSenderLabel />
            ) : staffSender ? (
              <Badge variant="outline" className="font-medium">
                From {staffSender}
              </Badge>
            ) : null}
            <Badge variant="secondary" className="font-mono text-[0.65rem]">
              {displayNotificationType(n)}
            </Badge>
            {(n.aggregateCount ?? 1) > 1 ? (
              <Badge variant="outline">{n.aggregateCount ?? 1} events</Badge>
            ) : null}
            {unread ? (
              <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Unread</Badge>
            ) : null}
          </div>

          {n.title ? (
            <SheetTitle
              className={cn(
                "pr-8 text-left text-lg leading-snug",
                isCritical && !fromPlatform && "text-destructive",
              )}
            >
              {n.title}
            </SheetTitle>
          ) : (
            <SheetTitle className="sr-only">Notification</SheetTitle>
          )}

          {n.createdAt ? (
            <SheetDescription className="text-left">{formatDate(n.createdAt)}</SheetDescription>
          ) : (
            <SheetDescription className="sr-only">Notification details</SheetDescription>
          )}
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 px-4">
          <p
            className={cn(
              "whitespace-pre-wrap break-words pb-4 text-[0.9375rem] leading-relaxed [overflow-wrap:anywhere] text-foreground",
              isCritical && !fromPlatform && "text-destructive/95",
            )}
          >
            {body}
          </p>
        </ScrollArea>

        <SheetFooter className="gap-2 border-t border-border/40 bg-muted/30 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {action ? (
            <Button type="button" className="w-full" onClick={handlePrimary}>
              {action.label}
              <ArrowUpRight className="ml-1 size-4" aria-hidden />
            </Button>
          ) : null}
          <Button
            type="button"
            variant={action ? "outline" : "default"}
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            {unread && !action ? (
              <>
                <Check className="mr-2 size-4" aria-hidden />
                Done
              </>
            ) : (
              "Close"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
