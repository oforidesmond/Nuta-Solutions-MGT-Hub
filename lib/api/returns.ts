import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { HubReturnDetail } from "@/lib/types/phase2";

function unwrapEntity<T>(data: unknown): T {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}

export async function fetchReturnDetail(
  saleId: string,
  returnId: string,
): Promise<HubReturnDetail> {
  const res = await api.get(endpoints.saleReturn(saleId, returnId));
  const raw = unwrapEntity<Record<string, unknown>>(res.data);
  const returnedItems = Array.isArray(raw.returnedItems)
    ? raw.returnedItems
    : Array.isArray(raw.returned_items)
      ? raw.returned_items
      : [];
  return {
    id: String(raw.id ?? returnId),
    originalSaleId: String(raw.originalSaleId ?? raw.original_sale_id ?? saleId),
    refundAmount: (raw.refundAmount ?? raw.refund_amount) as string | number | null | undefined,
    refundMethod: (raw.refundMethod ?? raw.refund_method) as string | undefined,
    paymentMethod: (raw.paymentMethod ?? raw.payment_method) as string | undefined,
    returnedItems: returnedItems as HubReturnDetail["returnedItems"],
    staffName: (raw.staffName ?? raw.staff_name) as string | undefined,
    createdAt: (raw.createdAt ?? raw.created_at) as string | undefined,
    originalSale: (raw.originalSale ?? raw.original_sale) as HubReturnDetail["originalSale"],
  };
}
