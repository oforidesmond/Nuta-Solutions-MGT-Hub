"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "@/lib/api/notifications";
import type { HubNotification } from "@/lib/types/phase2";
import { POLL_NOTIFICATIONS_MS, refetchIntervalWhenVisible } from "@/lib/query/poll-intervals";

export const notificationsListQueryKey = ["notifications", "list"] as const;

export function useNotifications() {
  const query = useQuery({
    queryKey: notificationsListQueryKey,
    queryFn: () => fetchNotifications({ limit: 50 }),
    refetchInterval: () => refetchIntervalWhenVisible(POLL_NOTIFICATIONS_MS),
  });

  return {
    items: (query.data ?? []) as HubNotification[],
    loading: query.isPending,
    error: query.error instanceof Error ? query.error : query.error ? new Error(String(query.error)) : null,
    reload: query.refetch,
  };
}
