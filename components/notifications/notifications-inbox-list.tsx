"use client";

import { Bell, RotateCw } from "lucide-react";
import {
  NotificationPreviewRow,
  notificationPreviewRowClassName,
} from "@/components/notifications/notification-preview-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { handleApiError } from "@/lib/api/errors";
import type { HubNotification } from "@/lib/types/phase2";

interface NotificationsInboxListProps {
  items: HubNotification[];
  loading: boolean;
  error: Error | null;
  onReload: () => void;
  onSelect: (notification: HubNotification) => void;
}

export function NotificationsInboxList({
  items,
  loading,
  error,
  onReload,
  onSelect,
}: NotificationsInboxListProps) {
  if (loading && items.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="gap-3 p-6">
        <p className="text-sm text-muted-foreground">{handleApiError(error)}</p>
        <Button size="sm" variant="outline" onClick={() => void onReload()}>
          <RotateCw className="mr-2 size-4" aria-hidden />
          Retry
        </Button>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="size-10" />}
        title="No notifications"
        description="Alerts from your store and NutaSolutions will appear here."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((n) => (
        <li key={n.id}>
          <Card className="overflow-hidden p-0 shadow-sm">
            <button
              type="button"
              className={notificationPreviewRowClassName(n)}
              onClick={() => onSelect(n)}
            >
              <NotificationPreviewRow notification={n} />
            </button>
          </Card>
        </li>
      ))}
    </ul>
  );
}
