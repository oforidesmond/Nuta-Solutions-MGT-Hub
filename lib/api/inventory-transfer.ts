import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { StockTransferBody, StockTransferResult } from "@/lib/types/branches";

/**
 * Move stock between branches atomically.
 * This route resolves branches from the body and does NOT use `X-Branch-Id`
 * (the client interceptor already skips the header for this path).
 */
export async function transferInventory(
  body: StockTransferBody,
): Promise<StockTransferResult> {
  const res = await api.post(endpoints.inventoryTransfer, body);
  const data = res.data;
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: StockTransferResult }).data;
  }
  return data as StockTransferResult;
}
