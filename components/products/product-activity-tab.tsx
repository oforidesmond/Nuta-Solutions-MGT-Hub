"use client";

import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportButton } from "@/components/exports/export-button";
import { LifecycleEntryCard } from "@/components/products/lifecycle-entry-card";
import { ProductHealthStrip } from "@/components/products/product-health-strip";
import { ProductInvestigationDrawer } from "@/components/products/product-investigation-drawer";
import {
  fetchProductLifecycleFinancials,
  fetchProductLifecyclePage,
} from "@/lib/api/product-lifecycle";
import { handleApiError } from "@/lib/api/errors";
import { buildExportFilename } from "@/lib/exports/filename";
import { fetchAllWithCursor } from "@/lib/exports/fetch-paginated";
import { lifecycleEntryToRow } from "@/lib/exports/row-mappers";
import { formatCurrency, toNumericAmount } from "@/lib/format";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { canViewProductLifecycle } from "@/lib/inventory-access";
import { productLifecycleKeys } from "@/lib/query/product-lifecycle-keys";
import {
  activityEntryMatchesChip,
  activityFilterChipToCategories,
  currentMonthDateRange,
  type ActivityFilterChip,
} from "@/lib/types/product-lifecycle";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const FILTER_CHIPS: { key: ActivityFilterChip; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sold", label: "Sold" },
  { key: "received", label: "Received" },
  { key: "problems", label: "Problems" },
];

type Props = {
  productId: string;
  productName?: string | null;
  enabled?: boolean;
};

function pickFinancialAmount(
  block: Record<string, unknown> | undefined | null,
  ...keys: string[]
): number {
  if (!block) return 0;
  for (const k of keys) {
    const v = block[k];
    if (v != null) return toNumericAmount(v as string | number);
  }
  return 0;
}

export function ProductActivityTab({ productId, productName, enabled = true }: Props) {
  const activeBranchId = useActiveBranchId();
  const organization = useAuthStore((s) => s.organization);
  const currency = organization?.currency ?? "GHS";
  const orgName = organization?.name ?? "org";
  const role = useAuthStore((s) => s.user?.role);
  const canView = canViewProductLifecycle(role);
  const [chip, setChip] = useState<ActivityFilterChip>("all");
  const [investigationOpen, setInvestigationOpen] = useState(false);
  const monthRange = currentMonthDateRange();

  const financialsQuery = useQuery({
    queryKey: productLifecycleKeys.financials(productId, activeBranchId, monthRange),
    queryFn: () =>
      fetchProductLifecycleFinancials(productId, {
        from: monthRange.from,
        to: monthRange.to,
      }),
    enabled: enabled && canView && !!productId,
    staleTime: 60_000,
  });

  const timelineQuery = useInfiniteQuery({
    queryKey: productLifecycleKeys.timeline(productId, activeBranchId, { chip }),
    queryFn: ({ pageParam }) =>
      fetchProductLifecyclePage(productId, {
        cursor: pageParam as string | undefined,
        limit: 50,
        categories: activityFilterChipToCategories(chip),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: enabled && canView && !!productId,
    staleTime: 60_000,
  });

  if (!canView) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have access to view product activity.
      </p>
    );
  }

  const fin = financialsQuery.data;
  const salesBlock = fin?.sales as Record<string, unknown> | undefined;
  const returnsBlock = fin?.returns as Record<string, unknown> | undefined;
  const shrinkageBlock = fin?.shrinkage as Record<string, unknown> | undefined;

  const soldAmount = pickFinancialAmount(salesBlock, "revenue", "grossProfit");
  const profitAmount = pickFinancialAmount(salesBlock, "grossProfit");
  const stockLost = pickFinancialAmount(shrinkageBlock, "loss", "lossAmount");
  const returnCount =
    typeof returnsBlock?.count === "number"
      ? returnsBlock.count
      : toNumericAmount(returnsBlock?.quantity as string | undefined);

  const entries =
    timelineQuery.data?.pages
      .flatMap((p) => p.data)
      .filter((entry) => activityEntryMatchesChip(entry, chip)) ?? [];

  const emptyFilterLabel =
    chip === "sold"
      ? "sold"
      : chip === "received"
        ? "received"
        : chip === "problems"
          ? "problem"
          : null;

  const timelineColumns = [
    { key: "occurredAt", header: "When" },
    { key: "category", header: "Type" },
    { key: "summary", header: "Summary" },
    { key: "quantityDelta", header: "Qty change" },
    { key: "revenue", header: "Revenue" },
    { key: "grossProfit", header: "Profit on sales" },
    { key: "loss", header: "Stock lost" },
    { key: "actor", header: "Staff" },
    { key: "branch", header: "Branch" },
    { key: "receiptNumber", header: "Receipt" },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border border-border/40 bg-muted/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            This month
          </p>
          <ExportButton
            label="Export financials"
            filename={buildExportFilename({
              orgName,
              reportType: "product-financials",
              from: monthRange.from.slice(0, 10),
              to: monthRange.to.slice(0, 10),
            })}
            columns={[
              { key: "metric", header: "Metric" },
              { key: "value", header: "Value" },
            ]}
            disabled={financialsQuery.isPending || financialsQuery.isError}
            getRows={async () => ({
              rows: [
                { metric: "Product", value: productName ?? productId },
                { metric: "Sold", value: formatCurrency(soldAmount, currency) },
                { metric: "Profit on sales", value: formatCurrency(profitAmount, currency) },
                { metric: "Stock lost", value: formatCurrency(stockLost, currency) },
                { metric: "Returns", value: String(returnCount) },
                { metric: "Period from", value: monthRange.from.slice(0, 10) },
                { metric: "Period to", value: monthRange.to.slice(0, 10) },
              ],
            })}
          />
        </div>
        {financialsQuery.isPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : financialsQuery.isError ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-destructive">Could not load monthly summary.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void financialsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Sold</p>
              <p className="font-medium tabular-nums">{formatCurrency(soldAmount, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Profit on sales</p>
              <p className="font-medium tabular-nums">{formatCurrency(profitAmount, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Stock lost</p>
              <p className="font-medium tabular-nums text-destructive">
                {formatCurrency(stockLost, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Returns</p>
              <p className="font-medium tabular-nums">{returnCount}</p>
            </div>
          </div>
        )}
        <ProductHealthStrip productId={productId} enabled={enabled} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {FILTER_CHIPS.map(({ key, label }) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={chip === key ? "secondary" : "outline"}
              className="min-h-9"
              onClick={() => setChip(key)}
            >
              {label}
            </Button>
          ))}
        </div>
        <ExportButton
          label="Export activity"
          filename={buildExportFilename({
            orgName,
            reportType: `product-activity-${chip}`,
            from: monthRange.from.slice(0, 10),
            to: monthRange.to.slice(0, 10),
          })}
          columns={timelineColumns}
          disabled={timelineQuery.isPending}
          getRows={async () => {
            const { rows, truncated } = await fetchAllWithCursor({
              fetchPage: async (cursor) => {
                const page = await fetchProductLifecyclePage(productId, {
                  cursor,
                  limit: 50,
                  categories: activityFilterChipToCategories(chip),
                });
                return {
                  items: page.data.filter((entry) => activityEntryMatchesChip(entry, chip)),
                  nextCursor: page.nextCursor,
                };
              },
            });
            return {
              rows: rows.map(lifecycleEntryToRow),
              truncated,
            };
          }}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-9 text-muted-foreground"
          onClick={() => setInvestigationOpen(true)}
        >
          Something doesn&apos;t add up?
        </Button>
      </div>

      {timelineQuery.isPending ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : timelineQuery.isError ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{handleApiError(timelineQuery.error)}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void timelineQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {emptyFilterLabel
            ? `No ${emptyFilterLabel} activity recorded yet.`
            : "No activity recorded yet."}
        </p>
      ) : (
        <ul className={cn("space-y-3")}>
          {entries.map((entry) => (
            <LifecycleEntryCard key={entry.id} entry={entry} currency={currency} />
          ))}
        </ul>
      )}

      {timelineQuery.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full min-h-9"
          disabled={timelineQuery.isFetchingNextPage}
          onClick={() => {
            void timelineQuery.fetchNextPage().catch((e) => {
              toast.error(handleApiError(e));
            });
          }}
        >
          {timelineQuery.isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      ) : null}

      <ProductInvestigationDrawer
        productId={productId}
        productName={productName}
        open={investigationOpen}
        onOpenChange={setInvestigationOpen}
      />
    </div>
  );
}
