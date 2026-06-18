"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Loader2,
  Minus,
  Percent,
  RefreshCw,
  Scale,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DateRangePresetToolbar } from "@/components/filters/date-range-preset-toolbar";
import { PaginationBar } from "@/components/pagination/pagination-bar";
import { fetchStockTakesPage } from "@/lib/api/stock-takes";
import { handleApiError } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/format";
import { canManageStockTakes } from "@/lib/inventory-access";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { withBranchKey } from "@/lib/query/branch-query-keys";
import type { DateRangePreset } from "@/lib/date-range-presets";
import { rangeForPreset, toYyyyMmDd } from "@/lib/date-range-presets";
import type { StockTakeRow, StockTakesSummary } from "@/lib/types/stock-takes";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const LIMIT_OPTIONS = [20, 50, 100] as const;
/** Stock-quantity variance %: subtle row tint above this, stronger tint above HIGH_VARIANCE_PCT. */
const VARIANCE_ROW_MED_PCT = 5;
const VARIANCE_ROW_HIGH_PCT = 10;
/** Same numeric units as API (e.g. −50 in org currency). */
const SIGNIFICANT_LOSS_AMOUNT = 50;

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatQty(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function recordedByLabel(row: StockTakeRow): string {
  const u = row.user;
  if (!u) return "-";
  const parts = [u.staffId, u.email].filter(Boolean);
  return parts.join(" · ") || "-";
}

function changeTone(changeStr: string): "up" | "down" | "flat" {
  const n = Number(changeStr);
  if (!Number.isFinite(n)) return "flat";
  if (n > 0) return "up";
  if (n < 0) return "down";
  return "flat";
}

function numOrNull(s: string | null): number | null {
  if (s == null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function varianceRowHighlight(row: StockTakeRow): "high" | "med" | null {
  const n = numOrNull(row.variancePercentage);
  if (n == null) return null;
  const a = Math.abs(n);
  if (a > VARIANCE_ROW_HIGH_PCT) return "high";
  if (a > VARIANCE_ROW_MED_PCT) return "med";
  return null;
}

function formatVariancePct(raw: string | null): string {
  if (raw == null || raw === "") return "-";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "-";
  return `${n.toFixed(2)}%`;
}

function signedMoneyClass(n: number): string {
  if (n < 0) return "text-destructive";
  if (n > 0) return "text-emerald-700 dark:text-emerald-400";
  return "text-muted-foreground";
}

function avgVarianceClass(n: number): string {
  const a = Math.abs(n);
  if (a < 0.0005) return "text-muted-foreground";
  if (a >= 5) return "text-amber-700 dark:text-amber-400";
  if (n < 0) return "text-destructive";
  return "text-emerald-700 dark:text-emerald-400";
}

function KpiSkeletonCard() {
  return (
    <Card className="border-border/40 bg-card/80 shadow-sm">
      <CardContent className="flex flex-col gap-3 p-5">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-32" />
      </CardContent>
    </Card>
  );
}

function KpiCard(props: {
  icon: ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
  iconWrapClassName?: string;
  description?: string;
}) {
  const { icon, label, value, valueClassName, iconWrapClassName, description } = props;
  const id = `kpi-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <article
      className="rounded-xl border border-border/40 bg-card/80 p-5 shadow-sm"
      aria-labelledby={id}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/50",
            iconWrapClassName,
          )}
          aria-hidden
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p id={id} className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className={cn("text-xl font-semibold tracking-tight tabular-nums", valueClassName)}>{value}</p>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </div>
    </article>
  );
}

function KpiGrid({
  summary,
  currency,
  loading,
}: {
  summary: StockTakesSummary | null;
  currency: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Loading summary">
        <KpiSkeletonCard />
        <KpiSkeletonCard />
        <KpiSkeletonCard />
        <KpiSkeletonCard />
      </section>
    );
  }

  const shrink = summary ? Number(summary.totalShrinkageCost) : NaN;
  const over = summary ? Number(summary.totalOverageCost) : NaN;
  const net = summary ? Number(summary.totalFinancialImpact) : NaN;
  const avgVar = summary ? Number(summary.averageVariancePercentage) : NaN;
  const hasSummary = summary != null;

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Stock count financial summary">
      <KpiCard
        label="Total losses"
        description="Shrinkage at cost"
        value={hasSummary && Number.isFinite(shrink) ? formatCurrency(Math.max(0, shrink), currency) : "-"}
        valueClassName="text-destructive"
        iconWrapClassName="bg-destructive/10 text-destructive"
        icon={<TrendingDown className="size-5" strokeWidth={2} aria-hidden />}
      />
      <KpiCard
        label="Total gains"
        description="Overage at cost"
        value={hasSummary && Number.isFinite(over) ? formatCurrency(Math.max(0, over), currency) : "-"}
        valueClassName="text-emerald-700 dark:text-emerald-400"
        iconWrapClassName="border-emerald-600/25 bg-emerald-600/10 text-emerald-800 dark:text-emerald-200"
        icon={<TrendingUp className="size-5" strokeWidth={2} aria-hidden />}
      />
      <KpiCard
        label="Net impact"
        description="Losses minus gains"
        value={hasSummary && Number.isFinite(net) ? formatCurrency(net, currency) : "-"}
        valueClassName={signedMoneyClass(net)}
        iconWrapClassName="bg-muted text-foreground"
        icon={<Scale className="size-5" strokeWidth={2} aria-hidden />}
      />
      <KpiCard
        label="Avg variance"
        description="Across listed items"
        value={hasSummary && Number.isFinite(avgVar) ? `${avgVar.toFixed(2)}%` : "-"}
        valueClassName={hasSummary && Number.isFinite(avgVar) ? avgVarianceClass(avgVar) : "text-muted-foreground"}
        iconWrapClassName="bg-amber-500/10 text-amber-900 dark:text-amber-100"
        icon={<Percent className="size-5" strokeWidth={2} aria-hidden />}
      />
    </section>
  );
}

export default function StockTakePage() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const currency = useAuthStore((s) => s.organization?.currency) ?? "GHS";
  const activeBranchId = useActiveBranchId();
  const allowed = canManageStockTakes(role);

  const [preset, setPreset] = useState<DateRangePreset>("this_month");
  const [customStart, setCustomStart] = useState(() => toYyyyMmDd(new Date()));
  const [customEnd, setCustomEnd] = useState(() => toYyyyMmDd(new Date()));
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(20);

  const range = useMemo(
    () => rangeForPreset(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const params = useMemo(
    () => ({
      startDate: range.startDate,
      endDate: range.endDate,
      page,
      limit,
    }),
    [range.startDate, range.endDate, page, limit],
  );

  const listQuery = useQuery({
    queryKey: withBranchKey(activeBranchId, "inventory", "stock-takes", params),
    queryFn: () => fetchStockTakesPage(params),
    enabled: allowed,
    placeholderData: (prev) => prev,
  });

  const filtersDisabled = listQuery.isPending && !listQuery.data;
  const initialPayloadLoading = listQuery.isPending && !listQuery.data;
  const rows = listQuery.data?.data ?? [];
  const summary = listQuery.data?.summary ?? null;

  if (!allowed) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock counts</h1>
          <p className="text-sm text-muted-foreground">Physical inventory count history.</p>
        </div>
        <EmptyState
          title="Restricted"
          description="Only administrators and managers can view stock count history and record counts. This matches the API roles on inventory stock-take routes."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock counts</h1>
          <p className="text-sm text-muted-foreground">
            Physical counts, value impact, and forced sale counts. Record on{" "}
            <Link className="font-medium text-primary underline-offset-2 hover:underline" href="/products">
              All products
            </Link>
            .
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-10 gap-2 self-start"
          onClick={() => void listQuery.refetch()}
          disabled={listQuery.isFetching}
          aria-label={listQuery.isFetching ? "Refreshing stock counts" : "Refresh stock counts"}
        >
          {listQuery.isFetching ? (
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4 shrink-0" aria-hidden />
          )}
          Refresh
        </Button>
      </div>

      <Card className="border-border/40 bg-card/80 shadow-sm">
        <CardContent className="space-y-4 p-6">
          <h2 className="text-base font-semibold tracking-tight">Filters</h2>
          <DateRangePresetToolbar
            preset={preset}
            disabled={filtersDisabled}
            onPresetChange={(p) => {
              setPreset(p);
              setPage(1);
            }}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={(v) => {
              setCustomStart(v);
              setPage(1);
            }}
            onCustomEndChange={(v) => {
              setCustomEnd(v);
              setPage(1);
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="whitespace-nowrap">Rows per page</span>
              <select
                className="h-9 rounded-lg border border-input bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 interactive-cursor"
                value={limit}
                disabled={filtersDisabled}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
              >
                {LIMIT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </CardContent>
      </Card>

      <KpiGrid summary={summary} currency={currency} loading={initialPayloadLoading} />

      <Card className="border-border/40 bg-card/80 shadow-sm">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" aria-hidden />
            <h2 className="text-base font-semibold tracking-tight">History</h2>
          </div>

          {listQuery.isError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
              <p className="font-medium text-destructive">{handleApiError(listQuery.error)}</p>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void listQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : null}

          {initialPayloadLoading ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading stock counts table">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
                title="No stock counts in this range"
              description="No stock counts recorded yet for these filters. Use the stock count action on each product row under All products to record physical counts."
              action={{ label: "Go to products", onClick: () => router.push("/products") }}
            />
          ) : (
            <Table className="min-w-[64rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Before</TableHead>
                  <TableHead className="text-right">After</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Financial impact</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Recorded by</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const tone = changeTone(row.quantityChange);
                  const changeClass =
                    tone === "up"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : tone === "down"
                        ? "text-destructive"
                        : "text-muted-foreground";
                  const sign = Number(row.quantityChange) > 0 ? "+" : "";
                  const notes = row.notes?.trim() ?? "";

                  const fin = numOrNull(row.financialImpact);
                  const finClass =
                    fin == null ? "text-muted-foreground" : signedMoneyClass(fin);
                  const finAria =
                    fin == null
                      ? "No financial impact calculated"
                      : fin < 0
                        ? `Loss ${formatCurrency(Math.abs(fin), currency)}`
                        : fin > 0
                          ? `Gain ${formatCurrency(fin, currency)}`
                          : "No net financial impact";

                  const vp = numOrNull(row.variancePercentage);
                  const varClass =
                    vp == null
                      ? "text-muted-foreground"
                      : vp < 0
                        ? "text-destructive"
                        : vp > 0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-muted-foreground";
                  const varAria =
                    vp == null
                      ? "Variance not available, for example when prior system stock was zero"
                      : vp < 0
                        ? `Shortage ${formatVariancePct(row.variancePercentage)}, downward`
                        : vp > 0
                          ? `Overage ${formatVariancePct(row.variancePercentage)}, upward`
                          : `Variance ${formatVariancePct(row.variancePercentage)}`;

                  const vhl = varianceRowHighlight(row);
                  const rowBg =
                    vhl === "high"
                      ? "bg-amber-500/[0.08] dark:bg-amber-500/15"
                      : vhl === "med"
                        ? "bg-muted/70"
                        : undefined;

                  const highLoss = fin != null && fin <= -SIGNIFICANT_LOSS_AMOUNT;

                  return (
                    <TableRow key={row.id} className={rowBg}>
                      <TableCell className="whitespace-nowrap text-sm">{formatWhen(row.createdAt)}</TableCell>
                      <TableCell className="max-w-[11rem]">
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <span className="truncate font-medium">{row.product.name}</span>
                          {highLoss ? (
                            <Badge variant="destructive" className="shrink-0 text-[0.65rem]" title="Financial impact at or below negative fifty">
                              High loss
                            </Badge>
                          ) : null}
                        </div>
                        {row.branchName ? (
                          <span className="block truncate text-xs text-muted-foreground">{row.branchName}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-[7rem] truncate font-mono text-xs text-muted-foreground">
                        {row.product.sku?.trim() ? row.product.sku : "-"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatQty(row.quantityBefore)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatQty(row.quantityAfter)}</TableCell>
                      <TableCell className={cn("text-right font-medium tabular-nums", changeClass)}>
                        {sign}
                        {formatQty(row.quantityChange)}
                      </TableCell>
                      <TableCell className={cn("text-right text-sm font-medium tabular-nums", finClass)}>
                        {fin == null ? (
                          <span aria-label={finAria}>-</span>
                        ) : (
                          <span className="inline-flex items-center justify-end gap-1">
                            {fin < 0 ? (
                              <TrendingDown className="size-3.5 shrink-0" aria-hidden />
                            ) : fin > 0 ? (
                              <TrendingUp className="size-3.5 shrink-0" aria-hidden />
                            ) : (
                              <Minus className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                            )}
                            <span aria-label={finAria}>{formatCurrency(fin, currency)}</span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className={cn("text-right text-sm font-medium tabular-nums", varClass)}>
                        {vp == null ? (
                          <span aria-label={varAria}>-</span>
                        ) : (
                          <span
                            className="inline-flex items-center justify-end gap-0.5"
                            aria-label={varAria}
                          >
                            <span>{formatVariancePct(row.variancePercentage)}</span>
                            <span className="sr-only">{vp < 0 ? "shortage" : vp > 0 ? "overage" : "neutral"}</span>
                            <span aria-hidden className="text-xs">
                              {vp < 0 ? "↓" : vp > 0 ? "↑" : ""}
                            </span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[12rem] truncate text-sm" title={recordedByLabel(row)}>
                        {recordedByLabel(row)}
                      </TableCell>
                      <TableCell className="max-w-[14rem]">
                        {notes ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="line-clamp-2 cursor-default text-sm">{notes}</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p className="whitespace-pre-wrap text-xs">{notes}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {listQuery.data && rows.length > 0 ? (
            <PaginationBar
              page={listQuery.data.page}
              totalPages={listQuery.data.totalPages}
              total={listQuery.data.total}
              limit={listQuery.data.limit}
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
