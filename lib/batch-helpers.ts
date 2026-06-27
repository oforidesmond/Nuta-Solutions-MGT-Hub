import type { HubProduct } from "@/lib/types/domain";
import type { UpdateBatchBody } from "@/lib/api/batches";

/** Backend create-batch minimum (@Min(0.001)). */
export const MIN_BATCH_QUANTITY = 0.001;

export function resolveCostPriceAtPurchase(product: HubProduct): number | null {
  const raw = product.costPrice ?? product.orgCostPrice;
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseDecimalQtyInput(
  raw: string,
  min: number,
): { ok: true; magnitude: number } | { ok: false } {
  const t = raw.trim();
  if (t === "" || t === "+" || t === "-") return { ok: false };
  const normalized = t.startsWith("+") ? t.slice(1) : t;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < min) return { ok: false };
  return { ok: true, magnitude: n };
}

/** ISO / date string → `YYYY-MM-DD` for `<input type="date">`. */
export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function buildBatchUpdateBody(input: {
  initialBatchNumber: string;
  batchNumber: string;
  initialExpiry: string;
  expiryInput: string;
  initialManufactured: string;
  manufacturedInput: string;
  initialNotes: string;
  notes: string;
}): UpdateBatchBody {
  const body: UpdateBatchBody = {};
  const trimmedNumber = input.batchNumber.trim();
  if (trimmedNumber !== input.initialBatchNumber.trim()) {
    body.batchNumber = trimmedNumber || undefined;
  }

  const expiryChanged = input.expiryInput !== input.initialExpiry;
  if (expiryChanged) {
    if (input.expiryInput) {
      body.expiryDate = new Date(input.expiryInput).toISOString();
    } else if (input.initialExpiry) {
      body.expiryDate = "";
    }
  }

  const manufacturedChanged = input.manufacturedInput !== input.initialManufactured;
  if (manufacturedChanged && input.manufacturedInput) {
    body.manufacturedDate = new Date(input.manufacturedInput).toISOString();
  }

  const trimmedNotes = input.notes.trim();
  if (trimmedNotes !== input.initialNotes.trim()) {
    body.notes = trimmedNotes || undefined;
  }

  return body;
}
