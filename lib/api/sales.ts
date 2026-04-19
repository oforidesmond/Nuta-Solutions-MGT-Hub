import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { HubSale } from "@/lib/types/domain";

/** Normalize snake_case sale fields from the API into HubSale. */
export function normalizeSale(raw: unknown): HubSale {
  if (!raw || typeof raw !== "object") {
    return { id: "", totalAmount: 0 };
  }
  const r = raw as Record<string, unknown>;
  const createdByRaw = r.createdBy ?? r.created_by;
  const createdBy =
    createdByRaw && typeof createdByRaw === "object"
      ? (createdByRaw as HubSale["createdBy"])
      : undefined;

  return {
    id: String(r.id ?? ""),
    totalAmount: (r.totalAmount ?? r.total_amount ?? 0) as string | number,
    soldAt: (r.soldAt ?? r.sold_at) as string | null | undefined,
    syncedAt: (r.syncedAt ?? r.synced_at) as string | null | undefined,
    createdAt: (r.createdAt ?? r.created_at) as string | null | undefined,
    createdBy,
    createdById: (r.createdById ?? r.created_by_id) as string | undefined,
    receiptNumber: (r.receiptNumber ?? r.receipt_number) as string | undefined,
  };
}

function unwrapSalesList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o.sales)) return o.sales;
  }
  return [];
}

export async function fetchSales(): Promise<HubSale[]> {
  const res = await api.get(endpoints.sales);
  return unwrapSalesList(res.data).map(normalizeSale);
}
