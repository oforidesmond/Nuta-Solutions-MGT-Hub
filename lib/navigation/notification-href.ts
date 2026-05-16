import type { HubNotification } from "@/lib/types/phase2";

function metaString(m: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = m[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

function saleReturnHref(saleId: string, returnId: string): string {
  return `/sales/${encodeURIComponent(saleId)}/return/${encodeURIComponent(returnId)}`;
}

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
      const productId = metaString(m, "productId", "product_id", "placeholderProductId");
      if (productId) {
        return `/inventory/temporary-items?highlightProductId=${encodeURIComponent(productId)}`;
      }
      const legacyAgg = metaString(m, "aggregateId", "aggregate_id");
      if (legacyAgg) {
        return `/inventory/temporary-items?aggregateId=${encodeURIComponent(legacyAgg)}`;
      }
      return "/inventory/temporary-items";
    }
    case "RETURN_PROCESSED":
    case "RETURN_REQUESTED": {
      const saleId = metaString(
        m,
        "saleId",
        "sale_id",
        "originalSaleId",
        "original_sale_id",
      );
      const returnId = metaString(m, "returnId", "return_id");
      if (saleId && returnId) return saleReturnHref(saleId, returnId);
      if (n.type === "RETURN_REQUESTED") return "/returns";
      return "/sales";
    }
    case "STAFF_TIME_WARNING": {
      const staffId = metaString(m, "staffId", "staff_id", "userId", "user_id");
      if (staffId) return `/staff/${encodeURIComponent(staffId)}/devices`;
      return "/staff";
    }
    case "STOCK_VARIANCE_SALE": {
      const type = (n.relatedEntityType ?? "").toLowerCase();
      const id = n.relatedEntityId?.trim();
      if (type === "sale" && id) {
        return `/sales/${encodeURIComponent(id)}?highlightVariance=1`;
      }
      const saleId = metaString(m, "saleId", "sale_id");
      if (saleId) {
        return `/sales/${encodeURIComponent(saleId)}?highlightVariance=1`;
      }
      return "/sales";
    }
    case "LOW_STOCK": {
      const productId = metaString(m, "productId", "product_id");
      if (productId) return `/products/${encodeURIComponent(productId)}`;
      return "/inventory/alerts";
    }
    case "EXPIRY_WARNING":
      return "/products/expiring";
    case "DISCOUNT_ALERT": {
      const saleId = metaString(m, "saleId", "sale_id");
      if (saleId) return `/sales/${encodeURIComponent(saleId)}`;
      return "/sales";
    }
    case "SYSTEM_ALERT":
    case "PLAN_UPGRADE_REQUIRED":
    case "TRIAL_LIMIT_WARNING":
      return "/settings";
    default:
      return null;
  }
}
