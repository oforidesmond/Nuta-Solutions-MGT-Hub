import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { HubStockAdjustment } from "@/lib/types/domain";
import type { CreateInventoryAdjustmentPayload } from "@/lib/types/inventory-adjustments";

function unwrapEntity(data: unknown): unknown {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: unknown }).data;
  }
  return data;
}

function parseAdjustment(raw: unknown): HubStockAdjustment | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  return raw as HubStockAdjustment;
}

export async function createInventoryAdjustment(
  payload: CreateInventoryAdjustmentPayload,
): Promise<HubStockAdjustment> {
  const res = await api.post(endpoints.inventoryAdjustments, {
    productId: payload.productId,
    type: payload.type,
    quantityChange: payload.quantityChange,
    notes: payload.notes?.trim() ? payload.notes.trim() : undefined,
  });
  const row = parseAdjustment(unwrapEntity(res.data));
  if (!row) throw new Error("Invalid stock adjustment response");
  return row;
}
