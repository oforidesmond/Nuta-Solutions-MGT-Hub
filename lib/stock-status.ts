/**
 * When API omits reorderLevel, treat stock 1..DEFAULT_LOW_MAX as "running low"
 * (matches previous dashboard heuristic; document for backend alignment).
 */
export const DEFAULT_LOW_STOCK_MAX = 5;

export type StockStatusTone = "ok" | "low" | "out";

export function getStockStatus(
  quantity: number,
  reorderLevel: number | null | undefined,
): StockStatusTone {
  if (!Number.isFinite(quantity) || quantity <= 0) return "out";
  const threshold =
    reorderLevel != null && Number.isFinite(reorderLevel) && reorderLevel > 0
      ? reorderLevel
      : DEFAULT_LOW_STOCK_MAX;
  if (quantity <= threshold) return "low";
  return "ok";
}

export function productQuantity(p: {
  currentStock?: string | number | null;
  stockQuantity?: string | number | null;
}): number {
  const raw = p.stockQuantity ?? p.currentStock ?? 0;
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  return Number.isFinite(n) ? n : 0;
}

export function productReorderLevel(p: {
  reorderLevel?: string | number | null;
}): number | null {
  const raw = p.reorderLevel;
  if (raw == null || raw === "") return null;
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  return Number.isFinite(n) && n > 0 ? n : null;
}
