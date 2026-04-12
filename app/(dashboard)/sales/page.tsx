"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchSales } from "@/lib/api/sales";
import { formatCurrency, formatDateDMY, formatTime12h } from "@/lib/format";
import { useAuthStore } from "@/stores/auth-store";
import type { HubSale } from "@/lib/types/domain";

function createdByLabel(s: HubSale): string {
  const c = s.createdBy;
  if (!c) return "—";
  const n = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return n || c.email || "—";
}

export default function SalesPage() {
  const currency = useAuthStore((s) => s.organization?.currency) ?? "GHS";
  const [rows, setRows] = useState<HubSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchSales();
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) toast.error("Could not load sales.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
        <p className="text-sm text-muted-foreground">
          Recent transactions for your organization.
        </p>
      </div>
      <Card className="border-border/40 bg-card/80 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Created by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No sales yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((s) => {
                    const total = Number(s.totalAmount ?? 0);
                    const when = s.soldAt ?? s.createdAt;
                    return (
                      <TableRow key={s.id} className="transition-colors hover:bg-muted/40">
                        <TableCell className="font-mono text-sm">
                          {s.receiptNumber ?? s.id.slice(0, 8)}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
