"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Package, PackageMinus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MetricTile } from "@/components/analytics/metric-tile";
import { ExportButton } from "@/components/exports/export-button";
import { fetchBatchTrace } from "@/lib/api/batches";
import { handleApiError } from "@/lib/api/errors";
import { formatCurrency, formatDateDMY, formatLedgerWhen, toNumericAmount } from "@/lib/format";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { batchTraceKeys } from "@/lib/query/product-lifecycle-keys";
import { buildExportFilename } from "@/lib/exports/filename";
import { batchTraceToRows } from "@/lib/exports/row-mappers";
import type { BatchTraceConsumption, BatchTraceWriteOff } from "@/lib/types/batch-trace";
import { useAuthStore } from "@/stores/auth-store";

type Props = {
  productId: string | null;
  batchId: string | null;
  batchLabel?: string | null;
  productName?: string | null;
  expiryDate?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function pickFinancial(
  fin: Record<string, unknown> | null | undefined,
  ...keys: string[]
): number {
  if (!fin) return 0;
  for (const k of keys) {
    const v = fin[k];
    if (v != null) return toNumericAmount(v as string | number);
  }
  return 0;
}

function TraceRow({
  icon: Icon,
  title,
  meta,
  value,
  href,
}: {
  icon: typeof Receipt;
  title: string;
  meta?: string;
  value?: string | null;
  href?: string | null;
}) {
  return (
    <li className="flex gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted/40 text-muted-foreground"
        aria-hidden
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium leading-snug">{title}</p>
        {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
        {href ? (
          <Link href={href} className="text-xs text-primary underline-offset-2 hover:underline">
            View receipt
          </Link>
        ) : null}
        {value ? <p className="text-sm font-medium tabular-nums">{value}</p> : null}
      </div>
    </li>
  );
}

export function BatchTraceDrawer({
  productId,
  batchId,
  batchLabel,
  productName,
  expiryDate,
  open,
  onOpenChange,
}: Props) {
  const activeBranchId = useActiveBranchId();
  const organization = useAuthStore((s) => s.organization);
  const currency = organization?.currency ?? "GHS";
  const orgName = organization?.name ?? "org";

  const query = useQuery({
    queryKey:
      productId && batchId
        ? batchTraceKeys.detail(productId, batchId, activeBranchId)
        : ["batch-trace", "none"],
    queryFn: () => fetchBatchTrace(productId!, batchId!),
    enabled: open && !!productId && !!batchId,
    staleTime: 60_000,
  });

  const trace = query.data;
  const displayProduct = productName ?? trace?.batch.productName ?? "Product";
  const displayBatch = batchLabel ?? trace?.batch.batchNumber ?? batchId?.slice(0, 8) ?? "-";
  const displayExpiry = expiryDate ?? trace?.batch.expiryDate;

  const fin = trace?.financials as Record<string, unknown> | null | undefined;
  const spent = pickFinancial(fin, "spent", "receivedValue", "totalCost", "cost");
  const soldFor = pickFinancial(
    fin,
    "soldFor",
    "soldRevenue",
    "totalRevenue",
    "soldValue",
    "revenue",
  );
  const remaining = pickFinancial(fin, "remaining", "remainingValue", "remaining_value");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[min(92vh,40rem)] flex-col gap-0 rounded-t-2xl px-0 pb-0 sm:mx-auto sm:max-w-lg sm:side-right sm:max-h-full sm:rounded-none"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25 sm:hidden" aria-hidden />

        <SheetHeader className="space-y-2 border-b border-border/40 px-4 pb-4 pt-2 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <SheetTitle>Where did this batch go?</SheetTitle>
              <SheetDescription>
                {displayProduct} · Batch {displayBatch}
                {displayExpiry ? ` · Expires ${formatDateDMY(displayExpiry)}` : ""}
              </SheetDescription>
            </div>
            {trace ? (
              <ExportButton
                filename={buildExportFilename({
                  orgName,
                  reportType: "batch-trace",
                  from: batchId ?? undefined,
                  to: displayBatch,
                })}
                columns={[
                  { key: "section", header: "Section" },
                  { key: "detail", header: "Detail" },
                  { key: "quantity", header: "Quantity" },
                  { key: "receiptNumber", header: "Receipt" },
                  { key: "revenue", header: "Revenue" },
                  { key: "lossAmount", header: "Stock lost" },
                  { key: "spent", header: "Spent" },
                  { key: "soldFor", header: "Sold for" },
                  { key: "remaining", header: "Remaining" },
                  { key: "occurredAt", header: "When" },
                ]}
                getRows={async () => ({ rows: batchTraceToRows(trace) })}
              />
            ) : null}
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 px-4 py-4">
          {query.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : query.isError ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{handleApiError(query.error)}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
                Retry
              </Button>
            </div>
          ) : trace ? (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-2">
                <MetricTile label="You spent" value={formatCurrency(spent, currency)} />
                <MetricTile label="Sold for" value={formatCurrency(soldFor, currency)} highlight />
                <MetricTile label="Still in stock" value={formatCurrency(remaining, currency)} />
              </div>

              {trace.received ? (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Stock received</h3>
                  <TraceRow
                    icon={Package}
                    title={
                      trace.received.summary ??
                      `Received ${trace.received.quantity ?? "-"} units`
                    }
                    meta={
                      trace.received.occurredAt
                        ? formatLedgerWhen(trace.received.occurredAt)
                        : undefined
                    }
                    value={
                      trace.received.totalCost != null
                        ? formatCurrency(toNumericAmount(trace.received.totalCost), currency)
                        : null
                    }
                  />
                </section>
              ) : null}

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Sold</h3>
                {trace.consumptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing sold from this batch yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {trace.consumptions.map((c: BatchTraceConsumption, i) => (
                      <TraceRow
                        key={c.id ?? c.saleId ?? i}
                        icon={Receipt}
                        title={
                          c.summary ??
                          `Sold ${c.quantityConsumed ?? "-"} units` +
                            (c.receiptNumber ? ` · ${c.receiptNumber}` : "")
                        }
                        meta={c.occurredAt ? formatLedgerWhen(c.occurredAt) : undefined}
                        value={
                          c.revenue != null
                            ? formatCurrency(toNumericAmount(c.revenue), currency)
                            : null
                        }
                        href={c.saleId ? `/sales/${c.saleId}` : null}
                      />
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Removed</h3>
                {trace.writeOffs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No expired or damaged stock removed from this batch.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {trace.writeOffs.map((w: BatchTraceWriteOff, i) => (
                      <TraceRow
                        key={w.id ?? i}
                        icon={PackageMinus}
                        title={w.summary ?? "Damaged or expired"}
                        meta={w.occurredAt ? formatLedgerWhen(w.occurredAt) : undefined}
                        value={
                          w.lossAmount != null
                            ? `−${formatCurrency(toNumericAmount(w.lossAmount), currency)}`
                            : null
                        }
                      />
                    ))}
                  </ul>
                )}
              </section>
            </div>
          ) : null}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
