"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchInventoryEvents } from "@/lib/api/products";
import { handleApiError } from "@/lib/api/errors";
import { formatDateDMY, formatTime12h } from "@/lib/format";
import type { HubInventoryEvent } from "@/lib/types/phase2";

function staffLabel(e: HubInventoryEvent): string {
  const s = e.staff;
  if (s) {
    const n = [s.firstName, s.lastName].filter(Boolean).join(" ");
    return n || "-";
  }
  return "-";
}

function referenceLabel(e: HubInventoryEvent): string {
  if (e.referenceId) {
    const short = e.referenceId.slice(0, 8);
    const kind = e.referenceType ?? "Ref";
    return `${kind} #${short}`;
  }
  return "-";
}

export function InventoryEventHistorySheet({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<HubInventoryEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !productId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchInventoryEvents(productId);
        if (!cancelled) setEvents(list);
      } catch (err) {
        if (!cancelled) toast.error(handleApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, productId]);

  const sorted = [...events].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="sm" className="min-h-9" />}>
        View history
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle>Inventory events</SheetTitle>
          <SheetDescription>
            Mobile-posted audit trail: sales, returns, adjustments, and restocks for this product.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-auto px-4 pb-6 pt-2">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inventory events recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Δ Qty</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((e) => {
                  const when = e.createdAt;
                  const ch = Number(e.quantityChange ?? 0);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {when ? (
                          <>
                            {formatDateDMY(when)}
                            <br />
                            {formatTime12h(when)}
                          </>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {String(e.eventType ?? "-").replace(/_/g, " ")}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${ch < 0 ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}
                      >
                        {ch >= 0 ? "+" : ""}
                        {ch}
                      </TableCell>
                      <TableCell className="text-sm">{staffLabel(e)}</TableCell>
                      <TableCell className="font-mono text-xs">{referenceLabel(e)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
