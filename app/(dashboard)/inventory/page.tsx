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
import { Badge } from "@/components/ui/badge";
import { fetchProducts } from "@/lib/api/products";
import { formatCurrency } from "@/lib/format";
import { useAuthStore } from "@/stores/auth-store";
import type { HubProduct } from "@/lib/types/domain";

function expiryLabel(p: HubProduct): { text: string; variant: "default" | "secondary" | "destructive" } {
  if (p.expirySummary) return { text: p.expirySummary, variant: "secondary" };
  if (!p.nearestExpiryDate) return { text: "No batch date", variant: "secondary" };
  const d = new Date(p.nearestExpiryDate).getTime();
  if (Number.isNaN(d)) return { text: "—", variant: "secondary" };
  const days = Math.ceil((d - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) return { text: "Expired", variant: "destructive" };
  if (days <= 30) return { text: `Expires in ${days}d`, variant: "destructive" };
  if (days <= 90) return { text: `Expires in ${days}d`, variant: "default" };
  return { text: formatDateShort(p.nearestExpiryDate), variant: "secondary" };
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function InventoryPage() {
  const currency = useAuthStore((s) => s.organization?.currency) ?? "GHS";
  const [rows, setRows] = useState<HubProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchProducts();
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) toast.error("Could not load products.");
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
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Products scoped to your organization.
        </p>
      </div>
      <Card className="border-border/40 bg-card/80 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Products</CardTitle>
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
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Expiry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      No products yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((p) => {
                    const qty = Number(p.currentStock ?? 0);
                    const price = Number(p.sellingPrice ?? 0);
                    const exp = expiryLabel(p);
                    return (
                      <TableRow key={p.id} className="transition-colors hover:bg-muted/40">
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number.isFinite(qty) ? qty : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(Number.isFinite(price) ? price : 0, currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={exp.variant}>{exp.text}</Badge>
                        </TableCell>
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
