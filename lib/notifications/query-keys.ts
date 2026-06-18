export const notificationsListQueryKey = ["notifications", "list"] as const;
export const notificationsUnreadCountQueryKey = ["notifications", "unread-count"] as const;

export const otherBranchUnreadQueryKeyPrefix = ["notifications", "other-branch-unread"] as const;

export function otherBranchUnreadQueryKey(activeBranchId: string | null) {
  return [...otherBranchUnreadQueryKeyPrefix, activeBranchId] as const;
}
