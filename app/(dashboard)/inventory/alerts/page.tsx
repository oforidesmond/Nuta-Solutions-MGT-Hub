"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchLowStockProducts, fetchProducts } from "@/lib/api/products";
import { handleApiError } from "@/lib/api/errors";
import { getStockStatus, productQuantity, productReorderLevel } from "@/lib/stock-status";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import type { HubProduct } from "@/lib/types/domain";

function shortfall(p: HubProduct): number {
  const q = productQuantity(p);
  const r = productReorderLevel(p);
  if (r == null) return Math.max(0, 5 - q);
  return Math.max(0, r - q);
}

export default function LowStockAlertsPage() {
  const activeBranchId = useActiveBranchId();
  const [rows, setRows] = useState<HubProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      try {
        const data = await fetchLowStockProducts();
        setRows(data);
        return;
      } catch (e) {
        if (!axios.isAxiosError(e) || e.response?.status !== 404) {
          throw e;
        }
      }
      const all = await fetchProducts();
      const active = all.filter((p) => p.isActive !== false);
      setRows(
        active.filter((p) => {
          const tone = getStockStatus(productQuantity(p), productReorderLevel(p));
          return tone === "low" || tone === "out";
        }),
      );
    } catch (e) {
      toast.error(handleApiError(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeBranchId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Low stock alerts</h1>
        <p className="text-sm text-muted-foreground">What to restock before you run out completely.</p>
      </div>

      <Card className="border-border/40 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Needs restocking</CardTitle>
          <CardDescription>
            {rows.length} product{rows.length === 1 ? "" : "s"} need attention.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing is running low. Great job.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Reorder at</TableHead>
                  <TableHead className="text-right">Short by</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => {
                  const q = productQuantity(p);
                  const r = productReorderLevel(p);
                  const reorderDisplay = r ?? 5;
                  const sh = shortfall(p);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <Link className="text-primary underline-offset-2 hover:underline" href={`/products/${p.id}`}>
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{q}</TableCell>
                      <TableCell className="text-right tabular-nums">{reorderDisplay}</TableCell>
                      <TableCell className="text-right tabular-nums">{sh} units</TableCell>
                      <TableCell>
                        <Button type="button" size="sm" variant="outline" className="min-h-9" render={<Link href={`/products/${p.id}/edit`} />}>
                          Restock
                        </Button>
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
