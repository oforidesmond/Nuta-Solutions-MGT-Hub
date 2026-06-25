import type { MultiSelectOption } from "@/components/platform/multi-select-dropdown";

export interface AuditEventsParams {
  cursor?: string;
  limit?: number;
  productId?: string;
  userId?: string;
  branchId?: string;
  eventType?: string[];
  aggregateType?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditActor {
  id: string;
  name: string;
}

export interface AuditEventRow {
  id?: string;
  eventType?: string;
  aggregateType?: string;
  aggregateId?: string;
  userId?: string;
  branchId?: string;
  branchName?: string;
  createdAt?: string;
  occurredAt?: string;
  actor?: AuditActor | null;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AuditEventsResponse {
  items: AuditEventRow[];
  nextCursor: string | null;
}

/** Curated tenant EventLog types for filter UI (extend as backend enum grows). */
export const TENANT_AUDIT_EVENT_OPTIONS: MultiSelectOption<string>[] = [
  { value: "SALE_COMPLETED", label: "Sale completed" },
  { value: "SALE_VOIDED", label: "Sale cancelled" },
  { value: "RETURN_PROCESSED", label: "Return processed" },
  { value: "STOCK_DISCREPANCY_RECORDED", label: "Stock count mismatch" },
  { value: "BRANCH_STOCK_VARIANCE", label: "Sale without scanning" },
  { value: "STOCK_TRANSFER_COMPLETED", label: "Stock transfer" },
  { value: "BATCH_RECEIVED", label: "Batch received" },
  { value: "BATCH_EXPIRED", label: "Batch expired" },
  { value: "PRICE_OVERRIDE_APPLIED", label: "Price override" },
  { value: "PRODUCT_UPDATED", label: "Product updated" },
  { value: "STOCK_ADJUSTMENT", label: "Stock adjustment" },
  { value: "STOCK_TAKE_COMPLETED", label: "Stock count completed" },
];

export function auditEventTypeLabel(eventType: string | undefined): string {
  if (!eventType) return "—";
  const found = TENANT_AUDIT_EVENT_OPTIONS.find((o) => o.value === eventType);
  if (found) return found.label;
  return eventType.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function auditEventProductId(row: AuditEventRow): string | null {
  if (row.aggregateType === "Product" && row.aggregateId) {
    return String(row.aggregateId);
  }
  const payload = row.payload;
  if (payload && typeof payload.productId === "string") return payload.productId;
  return null;
}
