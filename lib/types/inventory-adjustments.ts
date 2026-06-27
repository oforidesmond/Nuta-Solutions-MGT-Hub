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

/** Friendly labels for any adjustment type that can appear in history lists. */
export const ADJUSTMENT_DISPLAY_LABELS: Record<string, string> = {
  SUPPLIER_ADD: "Delivery from supplier",
  DAMAGE_EXPIRED_REMOVE: "Damaged / expired",
  CORRECT_ENTRY_ERROR: "Entry correction",
  BULK_TO_SINGLES: "Bulk conversion",
  STOCK_TRANSFER_OUT: "Transfer out",
  STOCK_TRANSFER_IN: "Transfer in",
};

export const ADJUSTMENT_FILTER_OPTIONS = Object.entries(ADJUSTMENT_DISPLAY_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export function formatAdjustmentType(type: string | null | undefined): string {
  if (!type) return "-";
  return ADJUSTMENT_DISPLAY_LABELS[type] ?? type.replace(/_/g, " ");
}
