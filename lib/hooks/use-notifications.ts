"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNotificationsRealtime } from "@/components/layout/notifications-realtime-provider";
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  type NotificationsUnreadCountResponse,
} from "@/lib/api/notifications";
import {
  notificationsListQueryKey,
  notificationsUnreadCountQueryKey,
  otherBranchUnreadQueryKeyPrefix,
} from "@/lib/notifications/query-keys";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { isCriticalNotificationType } from "@/lib/notifications/critical-notification";
import {
  notificationsRefetchInterval,
  POLL_NOTIFICATIONS_MS,
} from "@/lib/query/poll-intervals";
import type { HubNotification } from "@/lib/types/phase2";

export {
  notificationsListQueryKey,
  notificationsUnreadCountQueryKey,
} from "@/lib/notifications/query-keys";

const UNREAD_COUNT_POLL_MS = 30_000;
const UNREAD_COUNT_STALE_MS = 15_000;
const MAX_LIST_ITEMS = 100;

export function isNotificationUnread(n: HubNotification): boolean {
  return n.isRead !== true && n.read !== true;
}

export function useNotifications() {
  const { isSocketConnected } = useNotificationsRealtime();
  const activeBranchId = useActiveBranchId();
  const listKey = useMemo(
    () => notificationsListQueryKey(activeBranchId),
    [activeBranchId],
  );

  const query = useQuery({
    queryKey: listKey,
    queryFn: () => fetchNotifications({ limit: 50 }),
    refetchInterval: () =>
      notificationsRefetchInterval(POLL_NOTIFICATIONS_MS, isSocketConnected),
    select: (data) => data.slice(0, MAX_LIST_ITEMS),
  });

  return {
    items: (query.data ?? []) as HubNotification[],
    loading: query.isPending,
    error: query.error instanceof Error ? query.error : query.error ? new Error(String(query.error)) : null,
    reload: query.refetch,
  };
}

export function useUnreadCount() {
  const { isSocketConnected } = useNotificationsRealtime();
  const activeBranchId = useActiveBranchId();
  const countKey = useMemo(
    () => notificationsUnreadCountQueryKey(activeBranchId),
    [activeBranchId],
  );

  return useQuery({
    queryKey: countKey,
    queryFn: fetchUnreadCount,
    refetchInterval: () =>
      notificationsRefetchInterval(UNREAD_COUNT_POLL_MS, isSocketConnected),
    staleTime: UNREAD_COUNT_STALE_MS,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const activeBranchId = useActiveBranchId();
  const listKey = useMemo(
    () => notificationsListQueryKey(activeBranchId),
    [activeBranchId],
  );
  const countKey = useMemo(
    () => notificationsUnreadCountQueryKey(activeBranchId),
    [activeBranchId],
  );

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: countKey });

      const previousList = queryClient.getQueryData<HubNotification[]>(listKey);
      const previousCount = queryClient.getQueryData<NotificationsUnreadCountResponse>(
        countKey,
      );

      const now = new Date().toISOString();
      let nextList: HubNotification[] | undefined;
      queryClient.setQueryData<HubNotification[]>(listKey, (old) => {
        nextList = old?.map((n) =>
          n.id === id ? { ...n, isRead: true, read: true, readAt: now } : n,
        );
        return nextList;
      });

      queryClient.setQueryData<NotificationsUnreadCountResponse>(
        countKey,
        (old) => {
          if (!old) return old;
          const nextCount = Math.max(0, old.unreadCount - 1);
          const hasCritical =
            nextList?.some(
              (n) => isNotificationUnread(n) && isCriticalNotificationType(n.type),
            ) ?? false;
          return {
            ...old,
            unreadCount: nextCount,
            hasCritical,
          };
        },
      );

      return { previousList, previousCount };
    },
    onError: (_err, _id, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(listKey, context.previousList);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(countKey, context.previousCount);
      }
      toast.error("Failed to mark notification as read");
    },
    onSettled: () => {
      // Refresh list only. Skip unread-count invalidation here - server cache can
      // stay stale ~30s and would overwrite the optimistic badge decrement.
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({ queryKey: otherBranchUnreadQueryKeyPrefix });
    },
  });
}
