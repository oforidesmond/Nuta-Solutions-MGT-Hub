"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  fetchBatches,
  fetchExpiredBatches,
  fetchExpiringBatches,
  removeExpiredBatch,
} from "@/lib/api/batches";
import { handleApiError } from "@/lib/api/errors";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { formatDateDMY } from "@/lib/format";
import type { HubBatch } from "@/lib/types/domain";

export default function BatchesPage() {
  const activeBranchId = useActiveBranchId();
  const [rows, setRows] = useState<HubBatch[]>([]);
  const [expiring, setExpiring] = useState<HubBatch[]>([]);
  const [expired, setExpired] = useState<HubBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ items }, ex, exd] = await Promise.all([
        fetchBatches({ limit: 100 }),
        fetchExpiringBatches().catch(() => [] as HubBatch[]),
        fetchExpiredBatches().catch(() => [] as HubBatch[]),
      ]);
      setRows(items);
      setExpiring(ex);
      setExpired(exd);
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

  async function onRemoveExpired(id: string) {
    setWorkingId(id);
    try {
      await removeExpiredBatch(id);
      toast.success("Batch marked and stock updated");
      await load();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Batches &amp; expiry</h1>
        <p className="text-sm text-muted-foreground">See lots, dates, and what needs attention first.</p>
      </div>

      {(expired.length > 0 || expiring.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Expired</CardTitle>
              <CardDescription>Remove from stock when you have thrown goods away.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {expired.length === 0 ? (
                <p className="text-muted-foreground">None right now.</p>
              ) : (
                expired.map((b) => (
                  <div key={b.id} className="flex flex-col gap-2 rounded-lg border border-destructive/20 bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{b.product?.name ?? "Product"}</p>
                      <p className="text-xs text-muted-foreground">
                        Batch {b.batchNumber ?? b.id.slice(0, 8)} · expired {b.expiryDate ? formatDateDMY(b.expiryDate) : "-"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="min-h-9 shrink-0"
                      disabled={workingId === b.id}
                      onClick={() => void onRemoveExpired(b.id)}
                    >
                      {workingId === b.id ? "Working…" : "Remove from stock"}
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="text-base text-amber-900 dark:text-amber-100">Expiring soon</CardTitle>
              <CardDescription>Use these first on the shelf.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {expiring.length === 0 ? (
                <p className="text-muted-foreground">None in the warning window.</p>
              ) : (
                expiring.map((b) => (
                  <div key={b.id} className="rounded-lg border border-amber-500/20 bg-background/80 p-3">
                    <p className="font-medium">{b.product?.name ?? "Product"}</p>
                    <p className="text-xs text-muted-foreground">
                      Batch {b.batchNumber ?? "-"} · expires {b.expiryDate ? formatDateDMY(b.expiryDate) : "-"}
                    </p>
                    {b.product?.id ? (
                      <Link className="mt-2 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline" href={`/products/${b.product.id}`}>
                        View product
                      </Link>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-border/40 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">All batches</CardTitle>
          <CardDescription>Recent batches across your catalog.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No batches yet. Add batches when you receive stock with expiry dates.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">
                      {b.product?.id ? (
                        <Link className="text-primary underline-offset-2 hover:underline" href={`/products/${b.product.id}`}>
                          {b.product.name}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{b.branchName ?? "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{b.batchNumber ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{String(b.remainingQuantity ?? b.quantity ?? "-")}</TableCell>
                    <TableCell>{b.expiryDate ? formatDateDMY(b.expiryDate) : "-"}</TableCell>
                    <TableCell>
                      {b.isExpired ? <Badge variant="destructive">Expired</Badge> : <Badge variant="secondary">OK</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
