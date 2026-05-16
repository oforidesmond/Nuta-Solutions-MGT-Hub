import type { QueryClient } from "@tanstack/react-query";
import { notificationsUnreadCountQueryKey } from "@/lib/notifications/query-keys";

const DEBOUNCE_MS = 350;

let timeoutId: ReturnType<typeof setTimeout> | undefined;

export function debounceInvalidateUnreadCount(queryClient: QueryClient): void {
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    void queryClient.invalidateQueries({ queryKey: notificationsUnreadCountQueryKey });
    timeoutId = undefined;
  }, DEBOUNCE_MS);
}

export function clearDebounceInvalidateUnreadCount(): void {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = undefined;
  }
}
