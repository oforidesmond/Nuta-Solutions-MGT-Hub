"use client";

import { AlertTriangle } from "lucide-react";
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
import type { HubSale } from "@/lib/types/domain";

function createdByLabel(s: HubSale): string {
  const c = s.createdBy;
  if (!c) return "—";
  const n = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return n || c.email || "—";
}

export function SalesTable({
  rows,
  currency,
}: {
  rows: HubSale[];
  currency: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" aria-label="Sync" />
          <TableHead>Receipt</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Created by</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-muted-foreground">
              No sales yet.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((s) => {
            const total = Number(s.totalAmount ?? 0);
            const when = s.soldAt ?? s.createdAt;
            const delayed = isSaleDelayedSync(s);
            return (
              <TableRow key={s.id} className="transition-colors hover:bg-muted/40">
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
                <TableCell className="font-mono text-sm">
                  {s.receiptNumber?.trim() ? s.receiptNumber : "N/A"}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCurrency(Number.isFinite(total) ? total : 0, currency)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {when ? `${formatDateDMY(when)} · ${formatTime12h(when)}` : "—"}
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
