import type { QueryClient } from "@tanstack/react-query";
import {
  notificationsUnreadCountQueryKey,
  otherBranchUnreadQueryKeyPrefix,
} from "@/lib/notifications/query-keys";
import { useAuthStore } from "@/stores/auth-store";

const DEBOUNCE_MS = 350;

let timeoutId: ReturnType<typeof setTimeout> | undefined;

export function debounceInvalidateUnreadCount(queryClient: QueryClient): void {
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    const branchId = useAuthStore.getState().activeBranchId;
    void queryClient.invalidateQueries({
      queryKey: notificationsUnreadCountQueryKey(branchId),
    });
    void queryClient.invalidateQueries({ queryKey: otherBranchUnreadQueryKeyPrefix });
    timeoutId = undefined;
  }, DEBOUNCE_MS);
}

export function clearDebounceInvalidateUnreadCount(): void {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = undefined;
  }
}
