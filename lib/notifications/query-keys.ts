import { withBranchKey } from "@/lib/query/branch-query-keys";

export function notificationsListQueryKey(branchId: string | null) {
  return withBranchKey(branchId, "notifications", "list");
}

export function notificationsUnreadCountQueryKey(branchId: string | null) {
  return withBranchKey(branchId, "notifications", "unread-count");
}

export const otherBranchUnreadQueryKeyPrefix = ["notifications", "other-branch-unread"] as const;

export function otherBranchUnreadQueryKey(activeBranchId: string | null) {
  return [...otherBranchUnreadQueryKeyPrefix, activeBranchId] as const;
}
