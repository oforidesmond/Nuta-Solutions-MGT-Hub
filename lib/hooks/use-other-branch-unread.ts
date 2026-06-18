"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNotificationsRealtime } from "@/components/layout/notifications-realtime-provider";
import { fetchBranchesList } from "@/lib/api/branches";
import {
  fetchOtherBranchUnreadSummaries,
  formatOtherBranchUnreadHint,
  type OtherBranchUnreadSummary,
} from "@/lib/notifications/other-branch-unread";
import { otherBranchUnreadQueryKey } from "@/lib/notifications/query-keys";
import {
  notificationsRefetchInterval,
  POLL_NOTIFICATIONS_MS,
} from "@/lib/query/poll-intervals";
import { useAuthStore } from "@/stores/auth-store";

const OTHER_BRANCH_STALE_MS = 30_000;

export function useOtherBranchUnreadSummaries(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;
  const user = useAuthStore((s) => s.user);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const { isSocketConnected } = useNotificationsRealtime();

  const isAdmin = user?.role === "ADMIN";
  const queryEnabled = enabled && isAdmin;

  const query = useQuery({
    queryKey: otherBranchUnreadQueryKey(activeBranchId),
    queryFn: async (): Promise<OtherBranchUnreadSummary[]> => {
      const branches = await fetchBranchesList();
      const active = branches.filter((b) => b.isActive !== false);
      if (active.length <= 1) return [];
      return fetchOtherBranchUnreadSummaries(active, activeBranchId);
    },
    enabled: queryEnabled,
    staleTime: OTHER_BRANCH_STALE_MS,
    refetchInterval: () =>
      queryEnabled
        ? notificationsRefetchInterval(POLL_NOTIFICATIONS_MS, isSocketConnected)
        : false,
  });

  const summaries = query.data ?? [];

  const formattedHint = useMemo(
    () => formatOtherBranchUnreadHint(summaries),
    [summaries],
  );

  return {
    summaries,
    formattedHint,
    loading: query.isPending && summaries.length === 0,
    isAdmin,
  };
}
