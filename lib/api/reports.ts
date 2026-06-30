/**
 * Branch reports — ledger-backed read model (ProductLedgerEntry aggregation on NestJS).
 *
 * Widget → API mapping (Phase 4 exit criteria):
 * | Widget              | API route                         | Ledger fields (UI labels)                          |
 * |---------------------|-----------------------------------|----------------------------------------------------|
 * | Branch P&L summary  | GET /reports/sales-summary        | sales/shrinkage/returns blocks + legacy totals     |
 * | Revenue trend chart | GET /reports/revenue-trends       | breakdown[] buckets only (no client summing)       |
 * | Staff leaderboard   | GET /reports/staff-performance    | name, transactions, total sales                    |
 * | Top products        | GET /analytics/org/top-products   | org-wide; ADMIN only (see analytics-org.ts)        |
 *
 * Frontend presents API string decimals only — no revenue/COGS/margin math in TSX.
 *
 * sales-summary `reportData` (ledger blocks are additive; legacy fields unchanged):
 * - `sales`: { revenue, cogs, grossProfit } — string decimals
 * - `shrinkage`: { loss }
 * - `returns`: { count }
 */
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { cleanQueryParams } from "@/lib/api/query-params";
import { toNumericAmount } from "@/lib/format";
import type { HubStaffMember } from "@/lib/types/staff";
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

function coalesceDisplayName(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (c != null && String(c).trim() !== "") return String(c).trim();
  }
  return null;
}

function personNameFromRecord(o: Record<string, unknown> | null): string | null {
  if (!o) return null;
  return coalesceDisplayName(
    o.name,
    o.staffName,
    o.fullName,
    o.displayName,
    [o.firstName, o.lastName]
      .filter((p) => p != null && String(p).trim() !== "")
      .join(" "),
    o.email,
  );
}

function resolveStaffDisplayName(row: Record<string, unknown>): string {
  const nested =
    asRecord(row.user) ??
    asRecord(row.staff) ??
    asRecord(row.actor) ??
    asRecord(row.staffProfile) ??
    asRecord(row.processedBy);

  return (
    coalesceDisplayName(
      row.name,
      row.staffName,
      row.fullName,
      row.displayName,
      personNameFromRecord(nested),
      [row.firstName, row.lastName]
        .filter((p) => p != null && String(p).trim() !== "")
        .join(" "),
      row.email,
      row.staffId,
    ) ?? "—"
  );
}

function staffMemberDisplayName(member: HubStaffMember): string {
  return (
    coalesceDisplayName(
      [member.firstName, member.lastName]
        .filter((p) => p != null && String(p).trim() !== "")
        .join(" "),
      member.email,
      member.staffId !== "-" ? member.staffId : null,
    ) ?? "—"
  );
}

/** Fill missing staff names from GET /staff when report rows only include ids. */
export function enrichStaffPerformanceRows(
  rows: StaffReportRow[],
  staff: HubStaffMember[],
  currentUser?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  },
): StaffReportRow[] {
  if (!staff.length && !currentUser) return rows;

  const byUserId = new Map(staff.map((s) => [s.id, s]));
  const byStaffId = new Map(
    staff.filter((s) => s.staffId && s.staffId !== "-").map((s) => [s.staffId, s]),
  );

  return rows.map((row) => {
    if (row.name && row.name !== "—") return row;
    const member =
      (row.userId ? byUserId.get(row.userId) : undefined) ??
      (row.staffId ? byStaffId.get(row.staffId) : undefined);
    if (member) return { ...row, name: staffMemberDisplayName(member) };
    if (currentUser?.id && row.userId === currentUser.id) {
      return {
        ...row,
        name:
          coalesceDisplayName(
            [currentUser.firstName, currentUser.lastName]
              .filter((p) => p != null && String(p).trim() !== "")
              .join(" "),
            currentUser.email,
          ) ?? "—",
      };
    }
    return row;
  });
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
  const financials = asRecord(d.financials);
  const periodRaw = asRecord(d.period) ?? asRecord(d.dateRange);
  const period = periodRaw
    ? {
        from: String(periodRaw.from ?? periodRaw.startDate ?? fallbackRange?.from ?? ""),
        to: String(periodRaw.to ?? periodRaw.endDate ?? fallbackRange?.to ?? ""),
      }
    : fallbackRange
      ? { from: fallbackRange.from, to: fallbackRange.to }
      : null;

  const salesSource = d.sales ?? financials?.sales ?? d;
  const sales = normalizeFinancialBlock(salesSource);
  const returns = normalizeFinancialBlock(d.returns ?? financials?.returns);
  const shrinkage = normalizeFinancialBlock(d.shrinkage ?? financials?.shrinkage);
  const netPosition = normalizeFinancialBlock(
    d.netPosition ?? d.net_position ?? financials?.netPosition,
  );
  const cogs = normalizeFinancialBlock(
    d.cogs ??
      financials?.cogs ??
      (asRecord(salesSource) ? { cogs: asRecord(salesSource)?.cogs } : null),
  );

  if (!sales.revenue && d.totalRevenue != null) {
    sales.revenue = String(d.totalRevenue);
  }
  if (!sales.grossProfit && d.grossProfit != null) {
    sales.grossProfit = String(d.grossProfit);
  }
  if (!sales.grossProfit && d.profit != null) {
    sales.grossProfit = String(d.profit);
  }
  if (!sales.grossProfit && d.profitOnSales != null) {
    sales.grossProfit = String(d.profitOnSales);
  }
  if (!cogs.cogs && d.totalCOGS != null) {
    cogs.cogs = String(d.totalCOGS);
  }
  if (!cogs.cogs && d.totalCogs != null) {
    cogs.cogs = String(d.totalCogs);
  }
  if (!sales.cogs && d.totalCOGS != null) {
    sales.cogs = String(d.totalCOGS);
  }
  if (!sales.cogs && d.totalCogs != null) {
    sales.cogs = String(d.totalCogs);
  }
  if (!sales.grossProfit && netPosition.grossProfit) {
    sales.grossProfit = netPosition.grossProfit;
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
    hasLedgerFinancials: reportDataHasLedgerFinancials(d),
  };
}

/** Whether reportData includes ledger P&L fields (not just legacy totalRevenue). */
export function reportDataHasLedgerFinancials(d: Record<string, unknown>): boolean {
  const financials = asRecord(d.financials);
  return Boolean(
    asRecord(d.sales) ||
      financials ||
      d.grossProfit != null ||
      d.totalCOGS != null ||
      d.totalCogs != null ||
      asRecord(d.cogs) ||
      asRecord(d.shrinkage) ||
      asRecord(d.returns),
  );
}

export function financialBlockHas(
  block: ProductLifecycleFinancialBlock | undefined,
  ...keys: string[]
): boolean {
  if (!block) return false;
  for (const k of keys) {
    const v = block[k];
    if (v != null && String(v).trim() !== "") return true;
  }
  return false;
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
      staffId: row.staffId != null ? String(row.staffId) : row.staff_id != null ? String(row.staff_id) : undefined,
      userId: row.userId != null ? String(row.userId) : row.user_id != null ? String(row.user_id) : undefined,
      name: resolveStaffDisplayName(row),
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
