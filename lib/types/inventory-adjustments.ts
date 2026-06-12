export type InventoryAdjustmentType =
  | "SUPPLIER_ADD"
  | "DAMAGE_EXPIRED_REMOVE"
  | "CORRECT_ENTRY_ERROR";

export interface CreateInventoryAdjustmentPayload {
  productId: string;
  type: InventoryAdjustmentType;
  quantityChange: number;
  notes?: string;
}

export const ADJUSTMENT_TYPE_LABELS: Record<InventoryAdjustmentType, string> = {
  SUPPLIER_ADD: "Delivery from supplier",
  DAMAGE_EXPIRED_REMOVE: "Item damaged or expired",
  CORRECT_ENTRY_ERROR: "Fix a wrong entry",
};
