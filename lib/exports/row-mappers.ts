import type { AuditEventRow } from "@/lib/types/audit";
import { auditEventProductId, auditEventTypeLabel } from "@/lib/types/audit";
import type { BatchTrace } from "@/lib/types/batch-trace";
import type { OrgInsightProductRow, OrgInsightStaffRow } from "@/lib/types/org-insights";
import { productConcernLabel, rowDisplayName } from "@/lib/types/org-insights";
import type { ProductLedgerEntry } from "@/lib/types/product-lifecycle";
import { ledgerCategoryLabel } from "@/lib/types/product-lifecycle";
import { safeJsonPretty } from "@/lib/audit-display";

export function lifecycleEntryToRow(entry: ProductLedgerEntry): Record<string, unknown> {
  return {
    occurredAt: entry.occurredAt,
    category: ledgerCategoryLabel(entry.category),
    summary: entry.summary,
    quantityDelta: entry.quantity?.delta ?? "",
    quantityBefore: entry.quantity?.before ?? "",
    quantityAfter: entry.quantity?.after ?? "",
    revenue: entry.financial?.revenue ?? "",
    cogs: entry.financial?.cogs ?? "",
    grossProfit: entry.financial?.grossProfit ?? "",
    loss: entry.financial?.loss ?? "",
    actor: entry.actor?.name ?? "",
    branch: entry.branch?.name ?? "",
    receiptNumber: entry.references?.receiptNumber ?? "",
  };
}

export function auditEventToRow(row: AuditEventRow): Record<string, unknown> {
  const productId = auditEventProductId(row);
  return {
    occurredAt: row.occurredAt ?? row.createdAt ?? "",
    eventType: auditEventTypeLabel(row.eventType),
    actor: row.actor?.name ?? row.userId ?? "",
    branch: row.branchName ?? row.branchId ?? "",
    aggregateType: row.aggregateType ?? "",
    aggregateId: row.aggregateId ?? "",
    productId: productId ?? "",
    payload: row.payload ? safeJsonPretty(row.payload) : "",
  };
}

export function batchTraceToRows(trace: BatchTrace): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const fin = trace.financials ?? {};
  rows.push({
    section: "Summary",
    detail: "ROI",
    spent: fin.spent ?? fin.receivedValue ?? fin.totalCost ?? "",
    soldFor: fin.soldFor ?? fin.soldRevenue ?? fin.totalRevenue ?? fin.soldValue ?? "",
    remaining: fin.remaining ?? fin.remainingValue ?? "",
    grossProfit: fin.grossProfit ?? "",
  });
  if (trace.received) {
    rows.push({
      section: "Received",
      detail: trace.received.summary ?? "",
      quantity: trace.received.quantity ?? "",
      totalCost: trace.received.totalCost ?? "",
      occurredAt: trace.received.occurredAt ?? "",
    });
  }
  for (const c of trace.consumptions) {
    rows.push({
      section: "Sold",
      detail: c.summary ?? "",
      quantity: c.quantityConsumed ?? "",
      receiptNumber: c.receiptNumber ?? "",
      revenue: c.revenue ?? "",
      occurredAt: c.occurredAt ?? "",
    });
  }
  for (const w of trace.writeOffs) {
    rows.push({
      section: "Removed",
      detail: w.summary ?? "",
      category: w.category ?? "",
      quantity: w.quantity ?? "",
      lossAmount: w.lossAmount ?? "",
      occurredAt: w.occurredAt ?? "",
    });
  }
  return rows;
}

export function orgInsightProductToRow(
  row: OrgInsightProductRow,
  currency: string,
  extra: Record<string, string> = {},
): Record<string, unknown> {
  return {
    product: rowDisplayName(row),
    branch: row.branchName ?? "",
    concern: productConcernLabel(row),
    lossAmount: row.lossAmount ?? "",
    stockValue: row.stockValue ?? "",
    returnRate: row.returnRate ?? "",
    ...extra,
    currency,
  };
}

export function orgInsightStaffToRow(row: OrgInsightStaffRow): Record<string, unknown> {
  return {
    name: row.name ?? "",
    branch: row.branchName ?? "",
    accountabilityIndex: row.accountabilityIndex ?? "",
    lossAmount: row.lossAmount ?? "",
    eventCount: row.eventCount ?? "",
  };
}
