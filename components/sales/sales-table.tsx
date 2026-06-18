"use client";

import Link from "next/link";
import { AlertTriangle, PackageX } from "lucide-react";
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
import { formatCurrency, formatDateDMY, formatTime12h } from "@/lib/format";
import { delayedSyncTooltipText, isSaleDelayedSync } from "@/lib/sale-sync";
import { FORCED_SALES_UI } from "@/lib/copy/forced-sales-ui";
import { cn } from "@/lib/utils";
import type { HubSale } from "@/lib/types/domain";

function createdByLabel(s: HubSale): string {
  const c = s.createdBy;
  if (!c) return "-";
  const n = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return n || c.email || "-";
}

/** Counts variance lines on the row when `items[]` is present on the list payload. */
function varianceLineCount(s: HubSale): number | null {
  if (!Array.isArray(s.items)) return null;
  return s.items.reduce((acc, it) => acc + (it.hasStockVariance ? 1 : 0), 0);
}

export function SalesTable({
  rows,
  currency,
  showBranch = false,
}: {
  rows: HubSale[];
  currency: string;
  /** Show which branch each sale occurred at (admin / org-wide views). */
  showBranch?: boolean;
}) {
  const colSpan = showBranch ? 7 : 6;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" aria-label="Sync" />
          <TableHead className="w-10" aria-label={FORCED_SALES_UI.tableColumn} />
          <TableHead>Receipt</TableHead>
          {showBranch ? <TableHead>Branch</TableHead> : null}
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Created by</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={colSpan} className="text-muted-foreground">
              No sales yet.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((s) => {
            const total = Number(s.totalAmount ?? 0);
            const when = s.soldAt ?? s.createdAt;
            const delayed = isSaleDelayedSync(s);
            const variance = s.hasStockVariance === true;
            const lineCount = variance ? varianceLineCount(s) : null;
            const detailHref = s.id ? `/sales/${s.id}` : null;
            const tooltipText =
              lineCount != null && lineCount > 0
                ? FORCED_SALES_UI.tooltipWithLines(lineCount)
                : FORCED_SALES_UI.tooltip;
            return (
              <TableRow
                key={s.id}
                className={cn(
                  "transition-colors hover:bg-muted/40",
                  variance && "bg-amber-50/40 dark:bg-amber-950/15",
                )}
              >
                <TableCell className="w-10 px-2 text-center">
                  {delayed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-md text-amber-600 outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring dark:text-amber-400"
                          aria-label="Delayed sync warning"
                        >
                          <AlertTriangle className="size-4 shrink-0" aria-hidden />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        {delayedSyncTooltipText(s)}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="inline-block size-8" aria-hidden />
                  )}
                </TableCell>
                <TableCell className="w-10 px-2 text-center">
                  {variance ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="relative inline-flex size-8 items-center justify-center rounded-md text-amber-700 dark:text-amber-300"
                          aria-label={tooltipText}
                        >
                          <PackageX className="size-4 shrink-0" aria-hidden />
                          {lineCount != null && lineCount > 0 ? (
                            <span
                              className="absolute -right-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold leading-none text-amber-50"
                              aria-hidden
                            >
                              {lineCount > 9 ? "9+" : lineCount}
                            </span>
                          ) : null}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        {tooltipText}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="inline-block size-8" aria-hidden />
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {detailHref ? (
                    <Link
                      href={detailHref}
                      className="text-foreground underline-offset-2 hover:underline"
                    >
                      {s.receiptNumber?.trim() ? s.receiptNumber : "N/A"}
                    </Link>
                  ) : s.receiptNumber?.trim() ? (
                    s.receiptNumber
                  ) : (
                    "N/A"
                  )}
                </TableCell>
                {showBranch ? (
                  <TableCell className="text-sm text-muted-foreground">
                    {s.branchName?.trim() ? s.branchName : "-"}
                  </TableCell>
                ) : null}
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCurrency(Number.isFinite(total) ? total : 0, currency)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {when ? `${formatDateDMY(when)} · ${formatTime12h(when)}` : "-"}
                </TableCell>
                <TableCell>{createdByLabel(s)}</TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
