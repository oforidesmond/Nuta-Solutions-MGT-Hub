/** Polling cadence for React Query `refetchInterval` (ms). */
export const POLL_DASHBOARD_MS = 60_000;
export const POLL_SALES_MS = 20_000;
export const POLL_NOTIFICATIONS_MS = 15_000;

export function refetchIntervalWhenVisible(ms: number): number | false {
  if (typeof document === "undefined") return ms;
  return document.visibilityState === "hidden" ? false : ms;
}
