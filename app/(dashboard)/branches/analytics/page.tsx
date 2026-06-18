"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  Boxes,
  Crown,
  Gauge,
  Package,
  RotateCcw,
  TrendingUp,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchOrgBranchComparison,
  fetchOrgInventoryValue,
  fetchOrgLowStock,
  fetchOrgProfit,
  fetchOrgReturnsSummary,
  fetchOrgRevenue,
  fetchOrgSalesVelocity,
  fetchOrgStaffPerformance,
  fetchOrgTopProducts,
  type OrgAnalyticsPeriod,
} from "@/lib/api/analytics-org";
import { handleApiError } from "@/lib/api/errors";
import { formatCurrency, toNumericAmount } from "@/lib/format";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const PERIODS: { value: OrgAnalyticsPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

function formatPercent(value: string | null | undefined): string {
  if (value == null) return "—";
  const n = toNumericAmount(value);
  return `${n.toFixed(1)}%`;
}

export default function OrgAnalyticsPage() {
  const [period, setPeriod] = useState<OrgAnalyticsPeriod>("month");
  const currency = useAuthStore((s) => s.organization?.currency) ?? "GHS";

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link
          href="/branches"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 w-fit")}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Branches
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Org-wide analytics</h1>
            <p className="text-sm text-muted-foreground">
              A command center across every branch of your business.
            </p>
          </div>
          <PeriodSelector period={period} onChange={setPeriod} />
        </div>
      </div>

      <HeadlineSection period={period} currency={currency} />
      <RevenueBreakdownSection period={period} currency={currency} />
      <BranchComparisonSection period={period} currency={currency} />
      <TopProductsSection period={period} currency={currency} />
      <div className="grid gap-6 lg:grid-cols-2">
        <LowStockSection />
        <InventoryValueSection currency={currency} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <StaffPerformanceSection period={period} currency={currency} />
        <ReturnsSection period={period} currency={currency} />
      </div>
      <SalesVelocitySection period={period} />
    </div>
  );
}

function PeriodSelector({
  period,
  onChange,
}: {
  period: OrgAnalyticsPeriod;
  onChange: (p: OrgAnalyticsPeriod) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border/40 bg-card p-1">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          aria-pressed={period === p.value}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            period === p.value
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  description?: string;
  icon?: typeof TrendingUp;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-border/40 bg-card/80 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden />
            </div>
          ) : null}
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function QueryState({
  isPending,
  isError,
  error,
  empty,
  children,
  skeletonHeight = "h-40",
}: {
  isPending: boolean;
  isError: boolean;
  error?: unknown;
  empty?: boolean;
  children: React.ReactNode;
  skeletonHeight?: string;
}) {
  if (isPending) return <Skeleton className={cn("w-full rounded-lg", skeletonHeight)} />;
  if (isError) return <p className="text-sm text-destructive">{handleApiError(error)}</p>;
  if (empty) return <p className="text-sm text-muted-foreground">No data for this period.</p>;
  return <>{children}</>;
}

function MetricTile({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        highlight ? "border-primary/30 bg-primary/5" : "border-border/40 bg-card/60",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          highlight ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function HeadlineSection({
  period,
  currency,
}: {
  period: OrgAnalyticsPeriod;
  currency: string;
}) {
  const revenueQuery = useQuery({
    queryKey: ["org-analytics", "revenue", period],
    queryFn: () => fetchOrgRevenue(period),
  });
  const profitQuery = useQuery({
    queryKey: ["org-analytics", "profit", period],
    queryFn: () => fetchOrgProfit(period),
  });

  const r = revenueQuery.data;
  const p = profitQuery.data;

  return (
    <section aria-label="Headline metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {revenueQuery.isPending || profitQuery.isPending ? (
        [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)
      ) : revenueQuery.isError || profitQuery.isError ? (
        <p className="col-span-full text-sm text-destructive">
          {handleApiError(revenueQuery.error ?? profitQuery.error)}
        </p>
      ) : (
        <>
          <MetricTile
            label="Revenue"
            value={formatCurrency(toNumericAmount(r?.totalRevenue), currency)}
            sub={`${r?.totalTransactions ?? 0} transactions`}
          />
          <MetricTile
            label="Average order value"
            value={formatCurrency(toNumericAmount(r?.averageOrderValue), currency)}
          />
          <MetricTile
            label="Gross profit"
            value={formatCurrency(toNumericAmount(p?.grossProfit), currency)}
            sub={`Cost of goods: ${formatCurrency(toNumericAmount(p?.totalCOGS), currency)}`}
          />
          <MetricTile
            label="Gross margin"
            value={formatPercent(p?.grossMargin)}
            sub="Profit as a share of revenue"
            highlight
          />
        </>
      )}
    </section>
  );
}

function RevenueBreakdownSection({
  period,
  currency,
}: {
  period: OrgAnalyticsPeriod;
  currency: string;
}) {
  const query = useQuery({
    queryKey: ["org-analytics", "revenue", period],
    queryFn: () => fetchOrgRevenue(period),
  });
  const data =
    query.data?.breakdown.map((b) => ({
      date: b.date,
      revenue: toNumericAmount(b.revenue),
      transactions: b.transactions,
    })) ?? [];

  return (
    <SectionCard title="Revenue breakdown" description="Revenue over the selected period" icon={TrendingUp}>
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        empty={data.length === 0}
        skeletonHeight="h-64"
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => String(v).slice(5)}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                width={56}
                tickFormatter={(v) => formatCurrency(Number(v), currency)}
              />
              <Tooltip
                formatter={(value: number | string) => formatCurrency(Number(value), currency)}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </QueryState>
    </SectionCard>
  );
}

function BranchComparisonSection({
  period,
  currency,
}: {
  period: OrgAnalyticsPeriod;
  currency: string;
}) {
  const query = useQuery({
    queryKey: ["org-analytics", "branch-comparison", period],
    queryFn: () => fetchOrgBranchComparison(period),
  });
  const branches = query.data?.branches ?? [];
  const winner = query.data?.winner;

  return (
    <SectionCard
      title="Branch comparison"
      description="How each branch is performing side by side"
      icon={Crown}
    >
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        empty={branches.length === 0}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => {
            const isRevenueWinner = winner?.byRevenue === b.branchId;
            const isMarginWinner = winner?.byMargin === b.branchId;
            return (
              <div
                key={b.branchId}
                className={cn(
                  "rounded-lg border p-4",
                  isRevenueWinner || isMarginWinner
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/40 bg-card/60",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-medium text-foreground">{b.branchName}</p>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {isRevenueWinner ? (
                    <Badge variant="secondary" className="gap-1">
                      <Crown className="size-3" aria-hidden />
                      Top revenue
                    </Badge>
                  ) : null}
                  {isMarginWinner ? (
                    <Badge variant="secondary" className="gap-1">
                      <Crown className="size-3" aria-hidden />
                      Best margin
                    </Badge>
                  ) : null}
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Revenue</dt>
                    <dd className="font-semibold tabular-nums">
                      {formatCurrency(toNumericAmount(b.revenue), currency)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Margin</dt>
                    <dd className="tabular-nums">{formatPercent(b.grossMargin)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Transactions</dt>
                    <dd className="tabular-nums">{b.transactions}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Avg order</dt>
                    <dd className="tabular-nums">
                      {formatCurrency(toNumericAmount(b.averageOrderValue), currency)}
                    </dd>
                  </div>
                  {b.stockAlerts > 0 ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Stock alerts</dt>
                      <dd className="font-medium text-amber-700 tabular-nums dark:text-amber-400">
                        {b.stockAlerts}
                      </dd>
                    </div>
                  ) : null}
                  {b.topProduct ? (
                    <div className="border-t border-border/40 pt-1.5">
                      <dt className="text-xs text-muted-foreground">Top product</dt>
                      <dd className="truncate text-sm">{b.topProduct.name}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            );
          })}
        </div>
      </QueryState>
    </SectionCard>
  );
}

function TopProductsSection({
  period,
  currency,
}: {
  period: OrgAnalyticsPeriod;
  currency: string;
}) {
  const [by, setBy] = useState<"revenue" | "quantity">("revenue");
  const query = useQuery({
    queryKey: ["org-analytics", "top-products", period, by],
    queryFn: () => fetchOrgTopProducts(period, by, 10),
  });
  const products = query.data?.products ?? [];

  return (
    <SectionCard
      title="Top products"
      description="Best sellers across the organisation"
      icon={Package}
      action={
        <div className="inline-flex gap-1 rounded-lg border border-border/40 bg-card p-1">
          {(["revenue", "quantity"] as const).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBy(b)}
              aria-pressed={by === b}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                by === b ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {b}
            </button>
          ))}
        </div>
      }
    >
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        empty={products.length === 0}
      >
        <ul className="space-y-1">
          {products.map((p, i) => (
            <li
              key={p.productId}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
              <span className="shrink-0 text-sm tabular-nums">
                {by === "revenue"
                  ? formatCurrency(toNumericAmount(p.totalRevenue), currency)
                  : `${p.totalQuantitySold} sold`}
              </span>
              <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {formatPercent(p.contributionPercent)}
              </span>
            </li>
          ))}
        </ul>
      </QueryState>
    </SectionCard>
  );
}

function LowStockSection() {
  const query = useQuery({
    queryKey: ["org-analytics", "low-stock"],
    queryFn: fetchOrgLowStock,
  });
  const items = query.data?.items ?? [];

  return (
    <SectionCard
      title="Low stock"
      description="Products at or below reorder level in any branch"
      icon={Boxes}
      action={
        query.data ? (
          <Badge variant={items.length > 0 ? "destructive" : "secondary"}>
            {query.data.totalAffectedProducts} affected
          </Badge>
        ) : null
      }
    >
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        empty={items.length === 0}
      >
        <ul className="space-y-2">
          {items.slice(0, 8).map((item) => (
            <li key={item.productId} className="rounded-lg border border-border/40 bg-card/60 p-3">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {item.branches.map((br) => (
                  <Badge key={br.branchId} variant="outline" className="gap-1 text-xs">
                    {br.branchName}: {toNumericAmount(br.currentStock)} / {toNumericAmount(br.reorderLevel)}
                  </Badge>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </QueryState>
    </SectionCard>
  );
}

function InventoryValueSection({ currency }: { currency: string }) {
  const query = useQuery({
    queryKey: ["org-analytics", "inventory-value"],
    queryFn: fetchOrgInventoryValue,
  });
  const byBranch = query.data?.byBranch ?? [];

  return (
    <SectionCard
      title="Inventory value"
      description="Stock value held per branch"
      icon={Package}
      action={
        query.data ? (
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(toNumericAmount(query.data.totalInventoryValue), currency)}
          </span>
        ) : null
      }
    >
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        empty={byBranch.length === 0}
      >
        <ul className="space-y-2">
          {byBranch.map((b) => (
            <li
              key={b.branchId}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-card/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{b.branchName}</p>
                <p className="text-xs text-muted-foreground">{b.productCount} products</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatCurrency(toNumericAmount(b.value), currency)}
              </span>
            </li>
          ))}
        </ul>
      </QueryState>
    </SectionCard>
  );
}

function StaffPerformanceSection({
  period,
  currency,
}: {
  period: OrgAnalyticsPeriod;
  currency: string;
}) {
  const query = useQuery({
    queryKey: ["org-analytics", "staff-performance", period],
    queryFn: () => fetchOrgStaffPerformance(period, 10),
  });
  const staff = query.data?.staff ?? [];

  return (
    <SectionCard title="Staff performance" description="Top performers org-wide" icon={Users}>
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        empty={staff.length === 0}
      >
        <ul className="space-y-1">
          {staff.map((s, i) => (
            <li key={s.staffId} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="truncate text-xs text-muted-foreground">{s.branchName}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {formatCurrency(toNumericAmount(s.totalSales), currency)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">{s.transactions} sales</p>
              </div>
            </li>
          ))}
        </ul>
      </QueryState>
    </SectionCard>
  );
}

function ReturnsSection({
  period,
  currency,
}: {
  period: OrgAnalyticsPeriod;
  currency: string;
}) {
  const query = useQuery({
    queryKey: ["org-analytics", "returns-summary", period],
    queryFn: () => fetchOrgReturnsSummary(period),
  });
  const data = query.data;

  return (
    <SectionCard title="Returns" description="Return rate across the organisation" icon={RotateCcw}>
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        empty={!data}
      >
        {data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <MetricTile label="Returns" value={String(data.totalReturns)} />
              <MetricTile
                label="Return rate"
                value={data.returnRate == null ? "—" : formatPercent(data.returnRate)}
              />
              <MetricTile
                label="Value"
                value={formatCurrency(toNumericAmount(data.totalReturnValue), currency)}
              />
            </div>
            {data.byBranch.length > 0 ? (
              <ul className="space-y-1.5">
                {data.byBranch.map((b) => (
                  <li
                    key={b.branchId}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate text-muted-foreground">{b.branchName}</span>
                    <span className="shrink-0 tabular-nums">
                      {b.returns} ·{" "}
                      {b.returnRate == null ? "no sales" : formatPercent(b.returnRate)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </QueryState>
    </SectionCard>
  );
}

function SalesVelocitySection({ period }: { period: OrgAnalyticsPeriod }) {
  const query = useQuery({
    queryKey: ["org-analytics", "sales-velocity", period],
    queryFn: () => fetchOrgSalesVelocity(period, 20),
  });
  const products = query.data?.products ?? [];

  return (
    <SectionCard
      title="Sales velocity"
      description="How fast stock is selling and days of stock left"
      icon={Gauge}
    >
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        empty={products.length === 0}
      >
        <ul className="space-y-1">
          {products.map((p) => {
            const days = p.daysOfStockLeft;
            const low = days != null && days <= 7;
            return (
              <li
                key={p.productId}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {toNumericAmount(p.avgDailySales).toFixed(1)}/day
                </span>
                <span
                  className={cn(
                    "w-28 shrink-0 text-right text-sm font-medium tabular-nums",
                    low ? "text-destructive" : "text-foreground",
                  )}
                >
                  {days == null ? "—" : `${days.toFixed(1)} days left`}
                </span>
              </li>
            );
          })}
        </ul>
      </QueryState>
    </SectionCard>
  );
}
