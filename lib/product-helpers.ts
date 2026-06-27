import type { HubProduct } from "@/lib/types/domain";

export function productCategoryLabel(p: HubProduct): string {
  const c = p.category;
  if (c == null) return "-";
  if (typeof c === "string") return c || "-";
  return c.name || "-";
}

function parseExpiryMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Earliest expiry from API flat fields, expiringBatches, or embedded batches. */
export function productNearestExpiryDate(p: HubProduct): string | null {
  if (p.nearestExpiryDate) return p.nearestExpiryDate;

  const candidates: string[] = [];
  for (const batch of p.expiringBatches ?? []) {
    if (batch.expiryDate) candidates.push(batch.expiryDate);
  }
  for (const batch of p.batches ?? []) {
    if (batch.expiryDate) candidates.push(batch.expiryDate);
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => (parseExpiryMs(a) ?? Infinity) - (parseExpiryMs(b) ?? Infinity));
  return candidates[0] ?? null;
}

/** Nearest expiring batch row (for batch number / quantity display). */
export function productNearestExpiringBatch(p: HubProduct) {
  const batches = p.expiringBatches ?? [];
  if (batches.length === 0) return null;

  return [...batches].sort(
    (a, b) =>
      (parseExpiryMs(a.expiryDate) ?? Infinity) - (parseExpiryMs(b.expiryDate) ?? Infinity),
  )[0];
}

export function productDaysUntilExpiry(p: HubProduct): number | null {
  const nearestBatch = productNearestExpiringBatch(p);
  if (nearestBatch?.daysUntilExpiry != null && Number.isFinite(nearestBatch.daysUntilExpiry)) {
    return nearestBatch.daysUntilExpiry;
  }

  const expiry = productNearestExpiryDate(p);
  if (!expiry) return null;

  const ms = parseExpiryMs(expiry);
  if (ms == null) return null;
  return Math.ceil((ms - Date.now()) / (24 * 60 * 60 * 1000));
}
