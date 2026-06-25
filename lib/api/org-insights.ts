/**
 * Org-wide product insight APIs (ADMIN only).
 * Backend Cache-Control: max-age=60 (120 for slow-stock).
 * Recommended React Query staleTime: 60_000 ms (120_000 for slow-stock).
 */
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { cleanQueryParams } from "@/lib/api/query-params";
import type { OrgAnalyticsPeriod } from "@/lib/api/analytics-org";
import type {
  OrgInsightBatchPerformance,
  OrgInsightIncidentPatterns,
  OrgInsightProductRow,
  OrgInsightReturnRates,
  OrgInsightShrinkage,
  OrgInsightSlowStock,
  OrgInsightStaffAccountability,
  OrgInsightStaffRow,
  OrgInsightTransferLeakage,
  OrgInsightVarianceSales,
  OrgInsightBatchRow,
  OrgInsightIncidentRow,
} from "@/lib/types/org-insights";
import { shrinkageScoreToConcern } from "@/lib/types/product-lifecycle";
import type { ProductLedgerEntry } from "@/lib/types/product-lifecycle";

export type OrgInsightQueryParams = {
  period?: OrgAnalyticsPeriod;
  from?: string;
  to?: string;
  branchId?: string;
};

/** slow-stock uses daysWithoutSale — not OrgAnalyticsPeriodQueryDto. */
export type OrgInsightSlowStockParams = {
  daysWithoutSale?: number;
  branchId?: string;
};

const DEFAULT_DAYS_WITHOUT_SALE = 30;

function unwrap<T>(data: unknown): T {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  return String(v);
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function mapProductRow(raw: unknown): OrgInsightProductRow {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const score = num(r.shrinkageScore ?? r.score);
  return {
    productId: str(r.productId),
    productName: str(r.productName ?? r.name),
    name: str(r.name ?? r.productName),
    branchId: str(r.branchId),
    branchName: str(r.branchName),
    lossAmount: str(r.lossAmount ?? r.loss ?? r.totalLoss),
    shrinkageScore: score,
    concernLevel: score != null ? shrinkageScoreToConcern(score) : null,
    stockValue: str(r.stockValue ?? r.inventoryValue ?? r.value),
    returnRate: str(r.returnRate),
    returnCount: num(r.returnCount ?? r.returns) as number | null,
  };
}

function mapStaffRow(raw: unknown): OrgInsightStaffRow {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  return {
    userId: str(r.userId ?? r.actorUserId ?? r.id),
    staffId: str(r.staffId),
    name: str(r.name ?? r.actorName),
    branchId: str(r.branchId),
    branchName: str(r.branchName),
    accountabilityIndex: num(r.accountabilityIndex ?? r.index ?? r.score),
    lossAmount: str(r.lossAmount ?? r.loss),
    eventCount: num(r.eventCount ?? r.incidentCount) as number | null,
  };
}

function mapBatchRow(raw: unknown): OrgInsightBatchRow {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  return {
    batchId: str(r.batchId ?? r.id),
    batchNumber: str(r.batchNumber),
    productId: str(r.productId),
    productName: str(r.productName ?? r.name),
    branchName: str(r.branchName),
    roi: str(r.roi ?? r.grossProfit),
    revenue: str(r.revenue ?? r.soldFor),
    cost: str(r.cost ?? r.totalCost),
  };
}

function mapIncidentRow(raw: unknown): OrgInsightIncidentRow {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  return {
    label: str(r.label ?? r.pattern),
    description: str(r.description ?? r.summary),
    window: str(r.window ?? r.timeWindow),
    count: num(r.count ?? r.incidentCount) as number | null,
    lossAmount: str(r.lossAmount ?? r.loss),
  };
}

function extractItems(raw: unknown, ...keys: string[]): unknown[] {
  if (!raw || typeof raw !== "object") return [];
  const r = raw as Record<string, unknown>;
  for (const k of keys) {
    if (Array.isArray(r[k])) return r[k] as unknown[];
  }
  if (Array.isArray(raw)) return raw;
  return [];
}

async function fetchOrgInsightRaw<T>(
  path: string,
  params: OrgInsightQueryParams = {},
): Promise<T> {
  const res = await api.get(path, {
    params: cleanQueryParams({
      period: params.period ?? "month",
      from: params.from,
      to: params.to,
      branchId: params.branchId,
    }),
  });
  return unwrap<T>(res.data);
}

export async function fetchOrgInsightShrinkage(
  params?: OrgInsightQueryParams,
): Promise<OrgInsightShrinkage> {
  const raw = await fetchOrgInsightRaw<Record<string, unknown>>(
    endpoints.analyticsOrg.insights.shrinkage,
    params,
  );
  const items = extractItems(raw, "items", "products", "data").map(mapProductRow);
  const highConcernCount = items.filter(
    (i) => i.concernLevel === "high" || shrinkageScoreToConcern(i.shrinkageScore) === "high",
  ).length;
  return {
    ...raw,
    items,
    totalLoss: str(raw.totalLoss ?? raw.lossAmount),
    highConcernCount,
  };
}

export async function fetchOrgInsightSlowStock(
  params?: OrgInsightSlowStockParams,
): Promise<OrgInsightSlowStock> {
  const res = await api.get(endpoints.analyticsOrg.insights.slowStock, {
    params: cleanQueryParams({
      daysWithoutSale: params?.daysWithoutSale ?? DEFAULT_DAYS_WITHOUT_SALE,
      branchId: params?.branchId,
    }),
  });
  const raw = unwrap<Record<string, unknown>>(res.data);
  const items = extractItems(raw, "items", "products", "data").map(mapProductRow);
  return {
    ...raw,
    items,
    totalValue: str(raw.totalValue ?? raw.totalInventoryValue),
  };
}

export async function fetchOrgInsightReturnRates(
  params?: OrgInsightQueryParams,
): Promise<OrgInsightReturnRates> {
  const raw = await fetchOrgInsightRaw<Record<string, unknown>>(
    endpoints.analyticsOrg.insights.returnRates,
    params,
  );
  return {
    ...raw,
    items: extractItems(raw, "items", "products", "data").map(mapProductRow),
  };
}

export async function fetchOrgInsightTransferLeakage(
  params?: OrgInsightQueryParams,
): Promise<OrgInsightTransferLeakage> {
  const raw = await fetchOrgInsightRaw<Record<string, unknown>>(
    endpoints.analyticsOrg.insights.transferLeakage,
    params,
  );
  return {
    ...raw,
    items: extractItems(raw, "items", "products", "transfers", "data").map(mapProductRow),
  };
}

export async function fetchOrgInsightBatchPerformance(
  params?: OrgInsightQueryParams,
): Promise<OrgInsightBatchPerformance> {
  const raw = await fetchOrgInsightRaw<Record<string, unknown>>(
    endpoints.analyticsOrg.insights.batchPerformance,
    params,
  );
  return {
    ...raw,
    items: extractItems(raw, "items", "batches", "data").map(mapBatchRow),
  };
}

export async function fetchOrgInsightVarianceSales(
  params?: OrgInsightQueryParams,
): Promise<OrgInsightVarianceSales> {
  const raw = await fetchOrgInsightRaw<Record<string, unknown>>(
    endpoints.analyticsOrg.insights.varianceSales,
    params,
  );
  return {
    ...raw,
    items: extractItems(raw, "items", "products", "byStaff", "data").map(mapProductRow),
  };
}

export async function fetchOrgInsightIncidentPatterns(
  params?: OrgInsightQueryParams,
): Promise<OrgInsightIncidentPatterns> {
  const raw = await fetchOrgInsightRaw<Record<string, unknown>>(
    endpoints.analyticsOrg.insights.incidentPatterns,
    params,
  );
  return {
    ...raw,
    items: extractItems(raw, "items", "patterns", "data").map(mapIncidentRow),
  };
}

export async function fetchOrgInsightStaffAccountability(
  params?: OrgInsightQueryParams,
): Promise<OrgInsightStaffAccountability> {
  const raw = await fetchOrgInsightRaw<Record<string, unknown>>(
    endpoints.analyticsOrg.insights.staffAccountability,
    params,
  );
  return {
    ...raw,
    items: extractItems(raw, "items", "staff", "data").map(mapStaffRow),
  };
}

export async function fetchOrgInsightStaffActivity(
  userId: string,
  params?: OrgInsightQueryParams,
): Promise<{ items: ProductLedgerEntry[]; period?: { from: string; to: string } }> {
  const raw = await fetchOrgInsightRaw<Record<string, unknown>>(
    endpoints.analyticsOrg.insights.staffActivity(userId),
    params,
  );
  const list = extractItems(raw, "data", "items", "entries");
  const items: ProductLedgerEntry[] = list.map((entry) => {
    const r = entry as Record<string, unknown>;
    const qty = (r.quantity ?? {}) as Record<string, unknown>;
    const fin = (r.financial ?? {}) as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      occurredAt: String(r.occurredAt ?? ""),
      category: String(r.category ?? ""),
      summary: String(r.summary ?? ""),
      quantity: {
        delta: String(qty.delta ?? "0"),
        before: String(qty.before ?? "0"),
        after: String(qty.after ?? "0"),
      },
      financial: {
        revenue: fin.revenue != null ? String(fin.revenue) : null,
        cogs: fin.cogs != null ? String(fin.cogs) : null,
        grossProfit: fin.grossProfit != null ? String(fin.grossProfit) : null,
        loss: fin.loss != null ? String(fin.loss) : null,
      },
      actor: r.actor as ProductLedgerEntry["actor"],
      branch: r.branch as ProductLedgerEntry["branch"],
      references: r.references as ProductLedgerEntry["references"],
    };
  });
  const period = raw.period as { from: string; to: string } | undefined;
  return { items, period };
}
