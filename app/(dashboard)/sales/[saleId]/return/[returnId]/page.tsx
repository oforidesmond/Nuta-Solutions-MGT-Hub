"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
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
import { fetchReturnDetail } from "@/lib/api/returns";
import { handleApiError } from "@/lib/api/errors";
import { formatCurrency } from "@/lib/format";
import { formatDateDMY, formatTime12h } from "@/lib/format";
import { useAuthStore } from "@/stores/auth-store";
import type { HubReturnDetail } from "@/lib/types/phase2";

export default function ReturnDetailPage() {
  const params = useParams();
  const saleId = params.saleId as string;
  const returnId = params.returnId as string;
  const currency = useAuthStore((s) => s.organization?.currency) ?? "GHS";
  const [data, setData] = useState<HubReturnDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await fetchReturnDetail(saleId, returnId);
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) toast.error(handleApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [saleId, returnId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" className="min-h-9" render={<Link href="/sales" />}>
          <ArrowLeft className="size-4" aria-hidden />
          Sales
        </Button>
        <p className="text-sm text-muted-foreground">Return could not be loaded.</p>
      </div>
    );
  }

  const refund = Number(data.refundAmount ?? 0);
  const orig = data.originalSale;
  const origTotal = orig?.totalAmount != null ? Number(orig.totalAmount) : null;
  const origWhen = orig?.soldAt;
  const lines = data.returnedItems ?? [];
  const refundMethodLabel = [data.refundMethod, data.paymentMethod]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .find(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" className="min-h-9" render={<Link href="/sales" />}>
          <ArrowLeft className="size-4" aria-hidden />
          Sales
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Return</h1>
        <p className="text-sm text-muted-foreground">
          Processed return linked to sale{" "}
          <span className="font-mono text-foreground">{saleId.slice(0, 8)}…</span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/40 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Original sale</CardTitle>
            <CardDescription>Snapshot from the server when available.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {orig ? (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium tabular-nums">
                    {origTotal != null && Number.isFinite(origTotal)
                      ? formatCurrency(origTotal, currency)
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Date</span>
                  <span>
                    {origWhen
                      ? `${formatDateDMY(origWhen)} · ${formatTime12h(origWhen)}`
                      : "—"}
                  </span>
                </div>
                {orig.receiptNumber ? (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Receipt</span>
                    <span className="font-mono">{orig.receiptNumber}</span>
                  </div>
                ) : null}
                {orig.items && orig.items.length > 0 ? (
                  <div className="border-t border-border/40 pt-3">
                    <p className="mb-2 text-muted-foreground">Line items</p>
                    <ul className="space-y-1">
                      {orig.items.map((it, i) => (
                        <li key={i} className="flex justify-between gap-2 text-sm">
                          <span className="truncate">{it.name ?? it.productId ?? "—"}</span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            ×{String(it.quantity ?? "—")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">Original sale details were not included in the response.</p>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="mt-2 w-full sm:w-auto"
              render={<Link href="/sales" />}
            >
              View all sales
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Return details</CardTitle>
            <CardDescription>
              {data.staffName ? `Processed by ${data.staffName}` : "Staff return"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-muted-foreground">Refund</span>
              <span className="text-lg font-semibold tabular-nums">
                {formatCurrency(Number.isFinite(refund) ? refund : 0, currency)}
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Refund method</p>
              <p className="font-medium">{refundMethodLabel || "—"}</p>
            </div>
            {data.createdAt ? (
              <p className="text-xs text-muted-foreground">
                Recorded {formatDateDMY(data.createdAt)} · {formatTime12h(data.createdAt)}
              </p>
            ) : null}
            {lines.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, i) => {
                    const up = Number(line.unitPrice ?? 0);
                    return (
                      <TableRow key={i}>
                        <TableCell>{line.productName ?? line.productId ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{String(line.quantity ?? "—")}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(Number.isFinite(up) ? up : 0, currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No returned line items in the response.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
