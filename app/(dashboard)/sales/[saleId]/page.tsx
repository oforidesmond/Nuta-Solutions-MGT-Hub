"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, PackageX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { handleApiError } from "@/lib/api/errors";
import { fetchSaleById } from "@/lib/api/sales";
import { formatCurrency, formatDateDMY, formatTime12h, toNumericAmount } from "@/lib/format";
import { delayedSyncTooltipText, isSaleDelayedSync } from "@/lib/sale-sync";
import type { HubSale, HubSaleLine } from "@/lib/types/domain";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { withBranchKey } from "@/lib/query/branch-query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { FORCED_SALES_UI } from "@/lib/copy/forced-sales-ui";
import { varianceReasonLabel } from "@/lib/variance-reason-labels";

function createdByLabel(sale: HubSale): string {
  const c = sale.createdBy;
  if (!c) return "-";
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return name || c.email || "-";
}

function approverLabel(line: HubSaleLine): string {
  if (line.varianceApprovedStaffId) return line.varianceApprovedStaffId;
  if (line.varianceApprovedById) return `${line.varianceApprovedById.slice(0, 8)}…`;
  return "-";
}

export default function SaleDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const saleId = params.saleId as string;
  const activeBranchId = useActiveBranchId();
  const highlightVariance = searchParams.get("highlightVariance") === "1";
  const currency = useAuthStore((s) => s.organization?.currency) ?? "GHS";
  const varianceSectionRef = useRef<HTMLDivElement | null>(null);

  const saleQuery = useQuery({
    queryKey: withBranchKey(activeBranchId, "sales", "detail", saleId),
    queryFn: () => fetchSaleById(saleId),
    enabled: Boolean(saleId),
  });

  const sale = saleQuery.data ?? null;
  const items = useMemo<HubSaleLine[]>(() => sale?.items ?? [], [sale?.items]);
  const varianceLines = useMemo(() => items.filter((it) => it.hasStockVariance), [items]);

  useEffect(() => {
    if (!highlightVariance) return;
    if (varianceLines.length === 0) return;
    const node = varianceSectionRef.current;
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlightVariance, varianceLines.length]);

  if (saleQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (saleQuery.isError || !sale || !sale.id) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" className="min-h-9" render={<Link href="/sales" />}>
          <ArrowLeft className="size-4" aria-hidden />
          Sales
        </Button>
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">Could not load sale.</p>
          {saleQuery.error ? (
            <p className="text-muted-foreground">{handleApiError(saleQuery.error)}</p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void saleQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const total = toNumericAmount(sale.totalAmount);
  const subtotal = sale.subtotal != null ? toNumericAmount(sale.subtotal) : null;
  const when = sale.soldAt ?? sale.createdAt ?? null;
  const synced = sale.syncedAt ?? null;
  const delayed = isSaleDelayedSync(sale);
  const receipt = sale.receiptNumber?.trim() || sale.receiptNumberMobile?.trim() || null;
  const variance = sale.hasStockVariance === true || varianceLines.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" className="min-h-9" render={<Link href="/sales" />}>
          <ArrowLeft className="size-4" aria-hidden />
          Sales
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Sale</h1>
          {variance ? (
            <Badge variant="outline" className="border-amber-500/60 text-amber-700 dark:text-amber-300">
              <PackageX className="mr-1 size-3.5" aria-hidden />
              {FORCED_SALES_UI.badge}
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {receipt ? (
            <>
              Receipt <span className="font-mono text-foreground">{receipt}</span>
            </>
          ) : (
            <>
              ID <span className="font-mono text-foreground">{sale.id.slice(0, 8)}…</span>
            </>
          )}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/40 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Sale summary</CardTitle>
            <CardDescription>Totals, timing, and creator.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Total</span>
              <span className="text-lg font-semibold tabular-nums">
                {formatCurrency(Number.isFinite(total) ? total : 0, currency)}
              </span>
            </div>
            {subtotal != null ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(Number.isFinite(subtotal) ? subtotal : 0, currency)}
                </span>
              </div>
            ) : null}
            {sale.paymentMethod ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Payment</span>
                <span className="font-medium">{sale.paymentMethod}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Sold at</span>
              <span>
                {when ? `${formatDateDMY(when)} · ${formatTime12h(when)}` : "-"}
              </span>
            </div>
            {synced ? (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Synced</span>
                <span className={delayed ? "text-amber-700 dark:text-amber-300" : ""}>
                  {`${formatDateDMY(synced)} · ${formatTime12h(synced)}`}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Created by</span>
              <span className="font-medium">{createdByLabel(sale)}</span>
            </div>
            {delayed ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-50/60 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>{delayedSyncTooltipText(sale)}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">{FORCED_SALES_UI.summaryTitle}</CardTitle>
            <CardDescription>
              {variance
                ? FORCED_SALES_UI.recordedAsForced(varianceLines.length, items.length)
                : FORCED_SALES_UI.noOnSale}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {variance ? (
              <ul className="space-y-1.5">
                {varianceLines.slice(0, 4).map((line, i) => (
                  <li key={line.id ?? i} className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="truncate font-medium">
                      {line.productName ?? line.productId ?? "-"}
                    </span>
                    <span className="text-muted-foreground">
                      {varianceReasonLabel(line.varianceReason ?? null)}
                    </span>
                  </li>
                ))}
                {varianceLines.length > 4 ? (
                  <li className="text-xs text-muted-foreground">
                    +{varianceLines.length - 4} more - see line items below.
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-muted-foreground">All lines settled against system stock.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card
        ref={varianceSectionRef}
        className={cn(
          "border-border/40 bg-card/80 shadow-sm",
          highlightVariance && variance && "ring-2 ring-amber-500/40",
        )}
      >
        <CardHeader>
          <CardTitle className="text-base font-medium">Line items</CardTitle>
          <CardDescription>
            {FORCED_SALES_UI.lineItemsNote}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No line items returned for this sale.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Line total</TableHead>
                  <TableHead>{FORCED_SALES_UI.tableColumn}</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Approved by</TableHead>
                  <TableHead>Approved at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((line, i) => {
                  const lineHasVariance = line.hasStockVariance === true;
                  const up = toNumericAmount(line.unitPrice);
                  const lt = toNumericAmount(line.lineTotal);
                  const note = line.varianceNote?.trim();
                  return (
                    <TableRow
                      key={line.id ?? i}
                      className={cn(
                        lineHasVariance &&
                          "bg-amber-50/50 hover:bg-amber-50/70 dark:bg-amber-950/15 dark:hover:bg-amber-950/25",
                      )}
                    >
                      <TableCell className="max-w-[16rem]">
                        <div className="truncate font-medium">
                          {line.productName ?? line.productId ?? "-"}
                        </div>
                        {line.productSku ? (
                          <div className="text-xs text-muted-foreground">{line.productSku}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {String(line.quantity ?? "-")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(Number.isFinite(up) ? up : 0, currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(Number.isFinite(lt) ? lt : 0, currency)}
                      </TableCell>
                      <TableCell>
                        {lineHasVariance ? (
                          <Badge
                            variant="outline"
                            className="border-amber-500/60 text-amber-700 dark:text-amber-300"
                          >
                            <PackageX className="mr-1 size-3" aria-hidden />
                            Yes
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lineHasVariance
                          ? varianceReasonLabel(line.varianceReason ?? null)
                          : "-"}
                      </TableCell>
                      <TableCell className="max-w-[14rem]">
                        {note ? (
                          <span className="block truncate" title={note}>
                            {note}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {lineHasVariance ? approverLabel(line) : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {line.varianceApprovedAt
                          ? `${formatDateDMY(line.varianceApprovedAt)} · ${formatTime12h(line.varianceApprovedAt)}`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
