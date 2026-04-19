import type { HubNotification } from "@/lib/types/phase2";

/** Prefer backend `actionUrl`; otherwise map by `type` + `metadata`. */
export function resolveNotificationHref(n: HubNotification): string | null {
  if (n.actionUrl?.trim()) {
    const raw = n.actionUrl.trim();
    if (raw.startsWith("/")) return raw;
    try {
      const base =
        typeof window !== "undefined" ? window.location.origin : "http://localhost";
      const u = new URL(raw, base);
      return `${u.pathname}${u.search}`;
    } catch {
      return null;
    }
  }

  const m = n.metadata ?? {};
  switch (n.type) {
    case "TEMPORARY_ITEM_SOLD": {
      const productId = m.productId ?? m.product_id ?? m.placeholderProductId;
      if (productId) {
        return `/inventory/temporary-items?highlightProductId=${encodeURIComponent(String(productId))}`;
      }
      const legacyAgg = m.aggregateId ?? m.aggregate_id;
      if (legacyAgg) {
        return `/inventory/temporary-items?aggregateId=${encodeURIComponent(String(legacyAgg))}`;
      }
      return "/inventory/temporary-items";
    }
    case "RETURN_PROCESSED": {
      const saleId = m.originalSaleId ?? m.original_sale_id;
      const returnId = m.returnId ?? m.return_id;
      if (saleId && returnId) {
        return `/sales/${String(saleId)}/return/${String(returnId)}`;
      }
      return null;
    }
    case "STAFF_TIME_WARNING": {
      const staffId = m.staffId ?? m.staff_id ?? m.userId ?? m.user_id;
      if (staffId) return `/staff/${String(staffId)}/devices`;
      return null;
    }
    default:
      return null;
  }
}
