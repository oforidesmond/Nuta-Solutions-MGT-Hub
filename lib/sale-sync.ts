import type { HubSale } from "@/lib/types/domain";

/** Fixed 24-hour threshold (ms). No settings UI - see Phase 2 alignment. */
export const DELAYED_SYNC_THRESHOLD_MS = 24 * 60 * 60 * 1000;

type SaleTimestamps = HubSale & {
  synced_at?: string | null;
  sold_at?: string | null;
};

function syncedAtMs(s: HubSale): number | null {
  const raw = s.syncedAt ?? (s as SaleTimestamps).synced_at;
  if (raw == null || raw === "") return null;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : null;
}

function soldAtMs(s: HubSale): number | null {
  const raw = s.soldAt ?? (s as SaleTimestamps).sold_at;
  if (raw == null || raw === "") return null;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Matches backend rule: require `synced_at`; if missing, not eligible for delayed warning.
 * `delayMs = syncedAt - soldAt > 24h`
 */
export function isSaleDelayedSync(s: HubSale): boolean {
  const syncMs = syncedAtMs(s);
  if (syncMs === null) return false;
  const soldMs = soldAtMs(s);
  if (soldMs === null) return false;
  const delayMs = syncMs - soldMs;
  return delayMs > DELAYED_SYNC_THRESHOLD_MS;
}

/** Whole hours between sale and sync (floored), for tooltip copy. */
export function formatSaleSyncDelayHours(s: HubSale): number | null {
  const syncMs = syncedAtMs(s);
  if (syncMs === null) return null;
  const soldMs = soldAtMs(s);
  if (soldMs === null) return null;
  return Math.floor((syncMs - soldMs) / (60 * 60 * 1000));
}

export function delayedSyncTooltipText(s: HubSale): string {
  const hours = formatSaleSyncDelayHours(s);
  if (hours != null && hours >= 0) {
    return `Synced ${hours} hours after sale (possible offline period).`;
  }
  return "This sale was synced more than 24 hours after it occurred (possible offline period).";
}
