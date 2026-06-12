"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotificationDetailOpener } from "@/components/notifications/notifications-detail-context";
import { NotificationsInboxList } from "@/components/notifications/notifications-inbox-list";
import { Button } from "@/components/ui/button";
import { useNotifications, useUnreadCount } from "@/lib/hooks/use-notifications";
import { canSendStaffNotifications } from "@/lib/notifications/can-send-staff-notifications";
import { useAuthStore } from "@/stores/auth-store";

export default function NotificationsInboxPage() {
  const user = useAuthStore((s) => s.user);
  const showSentLink = canSendStaffNotifications(user?.role);
  const { items, loading, error, reload } = useNotifications();
  const unreadQuery = useUnreadCount();
  const { openDetail } = useNotificationDetailOpener();

  const unreadCount = unreadQuery.data?.unreadCount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "All caught up - tap a notification to read the full message."}
          </p>
        </div>
        {showSentLink ? (
          <Button type="button" variant="outline" size="sm" render={<Link href="/notifications" />}>
            {/* <Bell className="mr-2 size-4" aria-hidden /> */}
            Staff notifications
          </Button>
        ) : null}
      </div>

      <NotificationsInboxList
        items={items}
        loading={loading}
        error={error}
        onReload={() => void reload()}
        onSelect={openDetail}
      />
    </div>
  );
}
