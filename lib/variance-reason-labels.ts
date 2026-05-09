import type { VarianceReason } from "@/lib/types/domain";

/**
 * Human-readable labels for the six API variance reasons. Keep aligned with the
 * staff mobile app so receipts and notifications read identically across surfaces.
 */
export const VARIANCE_REASON_LABELS: Record<VarianceReason, string> = {
  PHYSICAL_STOCK_PRESENT: "Physical stock present",
  PACK_BROKEN: "Pack broken into units",
  STOCK_NOT_RECEIVED: "Stock not yet received",
  EMERGENCY_SALE: "Emergency sale",
  SYSTEM_ERROR: "System error",
  OTHER: "Other",
};

export const VARIANCE_REASON_VALUES: VarianceReason[] = [
  "PHYSICAL_STOCK_PRESENT",
  "PACK_BROKEN",
  "STOCK_NOT_RECEIVED",
  "EMERGENCY_SALE",
  "SYSTEM_ERROR",
  "OTHER",
];

export function varianceReasonLabel(reason: string | null | undefined): string {
  if (!reason) return "—";
  return (
    VARIANCE_REASON_LABELS[reason as VarianceReason] ??
    reason.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
