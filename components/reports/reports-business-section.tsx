"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Package } from "lucide-react";
import { MetricTile } from "@/components/analytics/metric-tile";
import { ExportButton } from "@/components/exports/export-button";
import { SectionCard } from "@/components/analytics/section-card";
import { QueryState } from "@/components/analytics/query-state";
import { DateRangePresetToolbar } from "@/components/filters/date-range-preset-toolbar";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resolveOrgTopProductsQuery, resolveStaffPeriod, rangeFromPreset } from "@/lib/analytics-period";
import { fetchOrgTopProducts } from "@/lib/api/analytics-org";
import {
  fetchReportRevenueTrends,
  fetchReportSalesSummary,
  fetchReportStaffPerformance,
  normalizeBranchLedgerSummary,
  normalizeRevenueTrendPoints,
  normalizeStaffPerformanceRows,
} from "@/lib/api/reports";
import { formatCurrency, toNumericAmount } from "@/lib/format";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { canViewOrgAnalytics } from "@/lib/branch-access";
import type { DateRangePreset } from "@/lib/date-range-presets";
import { toYyyyMmDd } from "@/lib/date-range-presets";
import { reportKeys } from "@/lib/query/report-keys";
import { buildExportFilename } from "@/lib/exports/filename";
import type { ProductLifecycleFinancialBlock } from "@/lib/types/product-lifecycle";
import type { RevenueTrendPeriod } from "@/lib/types/reports";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

function pickBlockAmount(block: ProductLifecycleFinancialBlock | undefined, ...keys: string[]): number {
  if (!block) return 0;
  for (const k of keys) {
    const v = block[k];
    if (v != null) return toNumericAmount(v as string | number);
  }
  return 0;
}

function formatPercent(value: string | null | undefined): string {
  if (value == null) return "";
  const n = toNumericAmount(value);
  return `${n.toFixed(1)}%`;
}

export function ReportsBusinessSection() {
  const activeBranchId = useActiveBranchId();
  const organization = useAuthStore((s) => s.organization);
  const currency = organization?.currency ?? "GHS";
  const orgName = organization?.name ?? "org";
  const role = useAuthStore((s) => s.user?.role);
  const showOrgLink = canViewOrgAnalytics(role);

  const [preset, setPreset] = useState<DateRangePreset>("this_month");
  const [customStart, setCustomStart] = useState(() => toYyyyMmDd(new Date()));
  const [customEnd, setCustomEnd] = useState(() => toYyyyMmDd(new Date()));
  const [revenueGranularity, setRevenueGranularity] = useState<RevenueTrendPeriod>("weekly");
  const [topBy, setTopBy] = useState<"revenue" | "quantity">("revenue");

  const range = useMemo(
    () => rangeFromPreset(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const staffPeriod = useMemo(
    () => resolveStaffPeriod(preset, range.startDate, range.endDate),
    [preset, range.startDate, range.endDate],
  );

  const topProductsQueryParams = useMemo(
    () => resolveOrgTopProductsQuery(preset, range.startDate, range.endDate),
    [preset, range.startDate, range.endDate],
  );

  const salesSummaryQuery = useQuery({
    queryKey: reportKeys.salesSummary(activeBranchId, range.startDate, range.endDate),
    queryFn: () => fetchReportSalesSummary({ startDate: range.startDate, endDate: range.endDate }),
    enabled: Boolean(range.startDate && range.endDate),
    staleTime: 60_000,
  });

  const staffPerfQuery = useQuery({
    queryKey: reportKeys.staffPerformance(activeBranchId, staffPeriod),
    queryFn: () => fetchReportStaffPerformance({ period: staffPeriod }),
    staleTime: 60_000,
  });

  const revenueTrendsQuery = useQuery({
    queryKey: reportKeys.revenueTrends(
      activeBranchId,
      revenueGranularity,
      range.startDate,
      range.endDate,
    ),
    queryFn: () =>
      fetchReportRevenueTrends({
        period: revenueGranularity,
        startDate: range.startDate,
        endDate: range.endDate,
      }),
    staleTime: 60_000,
  });

  const topProductsQuery = useQuery({
    queryKey: reportKeys.orgTopProducts(
      topProductsQueryParams.period,
      topProductsQueryParams.from,
      topProductsQueryParams.to,
      topBy,
    ),
    queryFn: () =>
      fetchOrgTopProducts({
        ...topProductsQueryParams,
        by: topBy,
        limit: 10,
      }),
    enabled: showOrgLink,
    staleTime: 60_000,
  });

  const ledgerSummary = useMemo(() => {
    if (!salesSummaryQuery.data) return null;
    return normalizeBranchLedgerSummary(salesSummaryQuery.data, {
      from: range.startDate,
      to: range.endDate,
    });
  }, [salesSummaryQuery.data, range.startDate, range.endDate]);

  const staffRows = useMemo(
    () => normalizeStaffPerformanceRows(staffPerfQuery.data?.reportData ?? {}),
    [staffPerfQuery.data],
  );

  const chartData = useMemo(
    () => normalizeRevenueTrendPoints(revenueTrendsQuery.data?.reportData ?? {}),
    [revenueTrendsQuery.data],
  );

  const topProducts = topProductsQuery.data?.products ?? [];

  const branchLabel =
    ledgerSummary?.branch?.name ??
    salesSummaryQuery.data?.branch?.name ??
    staffPerfQuery.data?.branch?.name ??
    null;

  const soldAmount = pickBlockAmount(ledgerSummary?.sales, "revenue");
  const profitAmount = pickBlockAmount(ledgerSummary?.sales, "grossProfit");
  const cogsAmount = pickBlockAmount(ledgerSummary?.cogs, "cogs") || pickBlockAmount(ledgerSummary?.sales, "cogs");
  const stockLost = pickBlockAmount(ledgerSummary?.shrinkage, "loss", "lossAmount");
  const returnCount =
    typeof ledgerSummary?.returns?.count === "number"
      ? ledgerSummary.returns.count
      : pickBlockAmount(ledgerSummary?.returns, "quantity");

  const exportRange = { from: range.startDate, to: range.endDate };
  const summaryFilename = buildExportFilename({
    orgName,
    reportType: "reports-summary",
    ...exportRange,
  });
  const staffFilename = buildExportFilename({
    orgName,
    reportType: "staff-performance",
    ...exportRange,
  });
  const trendsFilename = buildExportFilename({
    orgName,
    reportType: `revenue-trends-${revenueGranularity}`,
    ...exportRange,
  });
  const productsFilename = buildExportFilename({
    orgName,
    reportType: `top-products-${topBy}`,
    ...exportRange,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {branchLabel ? `${branchLabel} · ` : ""}
            Figures from your stock and sales ledger for the selected period.
          </p>
          {showOrgLink ? (
            <p className="mt-1 text-sm text-muted-foreground">
              <Link
                href="/branches/analytics"
                className="font-medium text-foreground underline underline-offset-2"
              >
                See all branches → Org-wide analytics
              </Link>
            </p>
          ) : null}
        </div>
        <ExportButton
          filename={summaryFilename}
          columns={[
            { key: "metric", header: "Metric" },
            { key: "value", header: "Value" },
          ]}
          disabled={!ledgerSummary || salesSummaryQuery.isPending}
          getRows={async () => ({
            rows: [
              { metric: "Sold", value: formatCurrency(soldAmount, currency) },
              { metric: "Profit on sales", value: formatCurrency(profitAmount, currency) },
              { metric: "What it cost you", value: formatCurrency(cogsAmount, currency) },
              { metric: "Stock lost", value: formatCurrency(stockLost, currency) },
              { metric: "Returns", value: String(returnCount) },
              { metric: "Branch", value: branchLabel ?? "" },
              { metric: "Period from", value: range.startDate },
              { metric: "Period to", value: range.endDate },
            ],
          })}
        />
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium tracking-tight">Sales summary</h2>
          <p className="text-sm text-muted-foreground">
            Sold, profit, stock lost, and returns for this branch.
          </p>
        </div>
        <DateRangePresetToolbar
          preset={preset}
          onPresetChange={setPreset}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
        />
        <SectionCard
          title="Summary for selected range"
          description={`${range.startDate} → ${range.endDate}`}
        >
          {salesSummaryQuery.isPending ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : salesSummaryQuery.isError ? (
            <p className="text-sm text-destructive">Could not load sales summary.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricTile label="Sold" value={formatCurrency(soldAmount, currency)} />
              <MetricTile label="Profit on sales" value={formatCurrency(profitAmount, currency)} />
              <MetricTile label="What it cost you" value={formatCurrency(cogsAmount, currency)} />
              <MetricTile
                label="Stock lost"
                value={formatCurrency(stockLost, currency)}
                highlight={stockLost > 0}
              />
              <MetricTile label="Returns" value={String(returnCount)} />
            </div>
          )}
        </SectionCard>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium tracking-tight">Staff performance</h2>
            <p className="text-sm text-muted-foreground">
              Leaderboard for {range.startDate} → {range.endDate}
            </p>
          </div>
          <ExportButton
            filename={staffFilename}
            columns={[
              { key: "name", header: "Staff" },
              { key: "branchName", header: "Branch" },
              { key: "totalSales", header: "Sales" },
              { key: "transactions", header: "Receipts" },
            ]}
            disabled={staffRows.length === 0 || staffPerfQuery.isPending}
            getRows={async () => ({
              rows: staffRows.map((row) => ({
                name: row.name,
                branchName: row.branchName ?? "",
                totalSales: formatCurrency(toNumericAmount(row.totalSales), currency),
                transactions: row.transactions,
              })),
            })}
          />
        </div>
        <SectionCard title="Leaderboard" description={branchLabel ? branchLabel : undefined}>
          {staffPerfQuery.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : staffPerfQuery.isError ? (
            <p className="text-sm text-destructive">Could not load staff performance.</p>
          ) : staffRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff activity for this period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Receipts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffRows.map((row, idx) => (
                  <TableRow key={row.staffId ?? row.userId ?? idx}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.branchName ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(toNumericAmount(row.totalSales), currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.transactions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium tracking-tight">Revenue trends</h2>
            <p className="text-sm text-muted-foreground">How sales moved over time.</p>
          </div>
          <ExportButton
            filename={trendsFilename}
            columns={[
              { key: "period", header: "Period" },
              { key: "revenue", header: "Revenue" },
            ]}
            disabled={chartData.length === 0 || revenueTrendsQuery.isPending}
            getRows={async () => ({
              rows: chartData.map((point) => ({
                period: point.name,
                revenue: formatCurrency(toNumericAmount(point.value), currency),
              })),
            })}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="revenue-granularity">Granularity</Label>
            <select
              id="revenue-granularity"
              className="flex h-10 min-h-9 rounded-md border border-input bg-background px-3 py-2 text-sm interactive-cursor"
              value={revenueGranularity}
              onChange={(e) => setRevenueGranularity(e.target.value as RevenueTrendPeriod)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
        <SectionCard
          title="Trend chart"
          description={`${range.startDate} → ${range.endDate} · ${revenueGranularity}`}
        >
          <div className="h-[280px] w-full">
            {revenueTrendsQuery.isPending ? (
              <Skeleton className="h-full w-full" />
            ) : revenueTrendsQuery.isError ? (
              <p className="text-sm text-destructive">Could not load revenue trends.</p>
            ) : chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trend data for this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => {
                      const s = String(v);
                      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
                      return s;
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} width={48} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={chartData.length === 1 ? { r: 4 } : false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </section>

      {showOrgLink ? (
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium tracking-tight">Product performance</h2>
            <p className="text-sm text-muted-foreground">Best sellers across the organisation.</p>
          </div>
          <ExportButton
            filename={productsFilename}
            columns={[
              { key: "rank", header: "Rank" },
              { key: "name", header: "Product" },
              { key: "value", header: topBy === "revenue" ? "Revenue" : "Quantity sold" },
              { key: "contributionPercent", header: "Share %" },
            ]}
            disabled={topProducts.length === 0 || topProductsQuery.isPending}
            getRows={async () => ({
              rows: topProducts.map((p, i) => ({
                rank: i + 1,
                name: p.name,
                value:
                  topBy === "revenue"
                    ? formatCurrency(toNumericAmount(p.totalRevenue), currency)
                    : String(p.totalQuantitySold),
                contributionPercent: p.contributionPercent
                  ? formatPercent(p.contributionPercent)
                  : "",
              })),
            })}
          />
        </div>
        <SectionCard
          title="Top products"
          description={`${range.startDate} → ${range.endDate}`}
          icon={Package}
          action={
            <div className="inline-flex gap-1 rounded-lg border border-border/40 bg-card p-1">
              {(["revenue", "quantity"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setTopBy(b)}
                  aria-pressed={topBy === b}
                  className={cn(
                    "interactive-cursor rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                    topBy === b ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          }
        >
          <QueryState
            isPending={topProductsQuery.isPending}
            isError={topProductsQuery.isError}
            error={topProductsQuery.error}
            empty={topProducts.length === 0}
            emptyMessage="No product sales for this period."
          >
            <ul className="space-y-1">
              {topProducts.map((p, i) => (
                <li key={p.productId}>
                  <Link
                    href={`/products/${p.productId}?tab=activity`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                    <span className="shrink-0 text-sm tabular-nums">
                      {topBy === "revenue"
                        ? formatCurrency(toNumericAmount(p.totalRevenue), currency)
                        : `${p.totalQuantitySold} sold`}
                    </span>
                    {p.contributionPercent ? (
                      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {formatPercent(p.contributionPercent)}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </QueryState>
        </SectionCard>
      </section>
      ) : null}
    </div>
  );
}
