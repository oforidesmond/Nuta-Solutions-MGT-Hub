/**
 * Branch reports — ledger-backed read model (ProductLedgerEntry aggregation on NestJS).
 *
 * Widget → API mapping (Phase 4 exit criteria):
 * | Widget              | API route                         | Ledger fields (UI labels)                          |
 * |---------------------|-----------------------------------|----------------------------------------------------|
 * | Branch P&L summary  | GET /reports/sales-summary        | Sold, Profit on sales, Stock lost, Returns         |
 * | Revenue trend chart | GET /reports/revenue-trends       | breakdown[] buckets only (no client summing)       |
 * | Staff leaderboard   | GET /reports/staff-performance    | name, transactions, total sales                    |
 * | Top products        | GET /analytics/org/top-products   | org-wide; ADMIN only (see analytics-org.ts)        |
 *
 * Frontend presents API string decimals only — no revenue/COGS/margin math in TSX.
 */
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { cleanQueryParams } from "@/lib/api/query-params";
import { toNumericAmount } from "@/lib/format";
import type { ProductLifecycleFinancialBlock } from "@/lib/types/product-lifecycle";
import type {
  BranchLedgerSummary,
  ReportBranchContext,
  ReportRevenueTrendsParams,
  ReportSalesSummaryParams,
  ReportStaffPerformanceParams,
  RevenueTrendPoint,
  StaffReportRow,
} from "@/lib/types/reports";

export type { ReportBranchContext };

export interface ReportEnvelope {
  branch: ReportBranchContext | null;
  reportData: Record<string, unknown>;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function pickString(o: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return null;
}

function normalizeFinancialBlock(raw: unknown): ProductLifecycleFinancialBlock {
  const o = asRecord(raw);
  if (!o) return {};
  return {
    revenue: pickString(o, "revenue", "totalRevenue", "total_revenue"),
    cogs: pickString(o, "cogs", "totalCOGS", "total_cogs"),
    grossProfit: pickString(o, "grossProfit", "gross_profit", "profit"),
    loss: pickString(o, "loss", "lossAmount", "loss_amount"),
    count:
      typeof o.count === "number"
        ? o.count
        : typeof o.totalReturns === "number"
          ? o.totalReturns
          : typeof o.returns === "number"
            ? o.returns
            : null,
    quantity: pickString(o, "quantity", "returnQuantity"),
  };
}

/**
 * Unwrap the `{ branch, reportData }` envelope. Back-compatible: when the body
 * has no `reportData`, treat the whole body as the report payload.
 */
function unwrapReportEnvelope(data: unknown): ReportEnvelope {
  if (!data || typeof data !== "object") {
    return { branch: null, reportData: {} };
  }
  const o = data as Record<string, unknown>;
  const branchRaw = o.branch;
  const branch =
    branchRaw && typeof branchRaw === "object"
      ? {
          id: String((branchRaw as Record<string, unknown>).id ?? ""),
          name: String((branchRaw as Record<string, unknown>).name ?? ""),
        }
      : null;
  if (o.reportData && typeof o.reportData === "object") {
    return { branch, reportData: o.reportData as Record<string, unknown> };
  }
  return { branch, reportData: o };
}

/** Normalize sales-summary (or ledger-shaped) payload to branch P&L blocks. */
export function normalizeBranchLedgerSummary(
  envelope: ReportEnvelope,
  fallbackRange?: { from: string; to: string },
): BranchLedgerSummary {
  const d = envelope.reportData;
  const periodRaw = asRecord(d.period) ?? asRecord(d.dateRange);
  const period = periodRaw
    ? {
        from: String(periodRaw.from ?? periodRaw.startDate ?? fallbackRange?.from ?? ""),
        to: String(periodRaw.to ?? periodRaw.endDate ?? fallbackRange?.to ?? ""),
      }
    : fallbackRange
      ? { from: fallbackRange.from, to: fallbackRange.to }
      : null;

  const sales = normalizeFinancialBlock(d.sales ?? d);
  const returns = normalizeFinancialBlock(d.returns);
  const shrinkage = normalizeFinancialBlock(d.shrinkage);
  const netPosition = normalizeFinancialBlock(d.netPosition ?? d.net_position);
  const cogs = normalizeFinancialBlock(
    d.cogs ?? (asRecord(d.sales) ? { cogs: asRecord(d.sales)?.cogs } : null),
  );

  if (!sales.revenue && d.totalRevenue != null) {
    sales.revenue = String(d.totalRevenue);
  }
  if (!sales.grossProfit && d.grossProfit != null) {
    sales.grossProfit = String(d.grossProfit);
  }
  if (!shrinkage.loss && d.shrinkageLoss != null) {
    shrinkage.loss = String(d.shrinkageLoss);
  }
  if (!returns.count && d.returnCount != null) {
    returns.count =
      typeof d.returnCount === "number"
        ? d.returnCount
        : toNumericAmount(d.returnCount as string | number);
  }

  return {
    branch: envelope.branch,
    period,
    sales,
    returns,
    shrinkage,
    netPosition,
    cogs,
  };
}

function extractStaffRows(obj: Record<string, unknown>): Record<string, unknown>[] {
  const r = obj.rows ?? obj.data ?? obj.staff ?? obj.items ?? obj.results ?? obj.leaderboard;
  if (Array.isArray(r)) return r as Record<string, unknown>[];

  const rankings = obj.rankings;
  if (rankings && typeof rankings === "object") {
    const o = rankings as Record<string, unknown>;
    const preferred = o.byRevenue ?? o.bySalesCount ?? o.byReturnsCount;
    if (Array.isArray(preferred)) return preferred as Record<string, unknown>[];
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) return v as Record<string, unknown>[];
    }
  }
  return [];
}

/** Normalize staff-performance reportData to typed rows. */
export function normalizeStaffPerformanceRows(reportData: Record<string, unknown>): StaffReportRow[] {
  return extractStaffRows(reportData).map((row) => {
    const name = String(
      row.name ??
        row.staffName ??
        row.fullName ??
        [row.firstName, row.lastName].filter(Boolean).join(" ") ??
        "—",
    );
    const salesVal =
      row.totalSales ?? row.totalRevenue ?? row.revenue ?? row.sales ?? row.amount ?? "0";
    const tx =
      typeof row.transactions === "number"
        ? row.transactions
        : typeof row.salesCount === "number"
          ? row.salesCount
          : typeof row.count === "number"
            ? row.count
            : toNumericAmount(row.transactions as string | number);
    return {
      staffId: row.staffId != null ? String(row.staffId) : undefined,
      userId: row.userId != null ? String(row.userId) : undefined,
      name,
      branchId: row.branchId != null ? String(row.branchId) : undefined,
      branchName: row.branchName != null ? String(row.branchName) : undefined,
      totalSales: String(salesVal),
      transactions: Number.isFinite(tx) ? tx : 0,
    };
  });
}

/** Normalize revenue-trends reportData to chart points (display parsing only). */
export function normalizeRevenueTrendPoints(reportData: Record<string, unknown>): RevenueTrendPoint[] {
  const raw = reportData.buckets ?? reportData.data ?? reportData.points ?? reportData.series ?? reportData.trends;
  const rows = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).buckets)
      ? ((raw as Record<string, unknown>).buckets as unknown[])
      : [];
  if (!rows.length) return [];
  return rows.map((row, i) => {
    if (row && typeof row === "object") {
      const o = row as Record<string, unknown>;
      const name = String(o.period ?? o.label ?? o.date ?? o.bucket ?? o.week ?? i);
      const v = o.amount ?? o.revenue ?? o.total ?? o.value ?? o.sum;
      return { name, value: toNumericAmount(v as string | number) };
    }
    return { name: String(i), value: 0 };
  });
}

export async function fetchReportSalesSummary(
  params: ReportSalesSummaryParams,
): Promise<ReportEnvelope> {
  const res = await api.get(endpoints.reports.salesSummary, {
    params: cleanQueryParams({
      startDate: params.startDate,
      endDate: params.endDate,
    }),
  });
  return unwrapReportEnvelope(res.data);
}

export async function fetchReportStaffPerformance(
  params: ReportStaffPerformanceParams,
): Promise<ReportEnvelope> {
  const res = await api.get(endpoints.reports.staffPerformance, {
    params: cleanQueryParams({
      period: params.period,
    }),
  });
  return unwrapReportEnvelope(res.data);
}

export async function fetchReportRevenueTrends(
  params: ReportRevenueTrendsParams,
): Promise<ReportEnvelope> {
  const res = await api.get(endpoints.reports.revenueTrends, {
    params: cleanQueryParams({
      period: params.period,
      startDate: params.startDate,
      endDate: params.endDate,
    }),
  });
  return unwrapReportEnvelope(res.data);
}
