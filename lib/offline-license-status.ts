import type { OfflineLicenseCustomer } from "@/lib/types/offline-license";

export type OfflineShopStatusFilter =
  | "all"
  | "active"
  | "inactive"
  | "expiring"
  | "expired"
  | "not_activated";

export type OfflineShopStatusKind =
  | "inactive"
  | "not_activated"
  | "expired"
  | "expiring"
  | "active";

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_DAYS = 30;

export function amountGhsNumber(value: string | number | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function daysRemaining(validUntil: string | null | undefined, now = Date.now()): number | null {
  if (!validUntil) return null;
  const until = Date.parse(validUntil);
  if (!Number.isFinite(until)) return null;
  return Math.ceil((until - now) / DAY_MS);
}

export function deriveOfflineShopStatus(
  shop: Pick<OfflineLicenseCustomer, "isActive" | "validUntil">,
  now = Date.now(),
): OfflineShopStatusKind {
  if (!shop.isActive) return "inactive";
  if (!shop.validUntil) return "not_activated";
  const days = daysRemaining(shop.validUntil, now);
  if (days == null) return "not_activated";
  if (days < 0) return "expired";
  if (days <= EXPIRING_SOON_DAYS) return "expiring";
  return "active";
}

export function offlineShopStatusLabel(kind: OfflineShopStatusKind): string {
  switch (kind) {
    case "inactive":
      return "Inactive";
    case "not_activated":
      return "Not activated";
    case "expired":
      return "Expired";
    case "expiring":
      return "Expiring soon";
    case "active":
      return "Active";
  }
}

export function matchesOfflineShopFilter(
  shop: OfflineLicenseCustomer,
  filter: OfflineShopStatusFilter,
  now = Date.now(),
): boolean {
  if (filter === "all") return true;
  const kind = deriveOfflineShopStatus(shop, now);
  if (filter === "active") return kind === "active";
  if (filter === "inactive") return kind === "inactive";
  if (filter === "expiring") return kind === "expiring";
  if (filter === "expired") return kind === "expired";
  if (filter === "not_activated") return kind === "not_activated";
  return true;
}

export function matchesOfflineShopSearch(shop: OfflineLicenseCustomer, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [shop.name, shop.phone ?? "", shop.email ?? "", shop.id]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function activeDeviceCount(shop: OfflineLicenseCustomer): number {
  return (shop.devices ?? []).filter((d) => !d.revokedAt).length;
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
