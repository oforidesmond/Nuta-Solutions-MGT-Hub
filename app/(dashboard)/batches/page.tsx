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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BatchTraceDrawer } from "@/components/batches/batch-trace-drawer";
import { BatchEditDialog } from "@/components/batches/batch-edit-dialog";
import {
  fetchBatches,
  fetchExpiredBatches,
  fetchExpiringBatches,
  removeExpiredBatch,
} from "@/lib/api/batches";
import { handleApiError } from "@/lib/api/errors";
import { canManageStockTakes } from "@/lib/inventory-access";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { formatDateDMY } from "@/lib/format";
import type { HubBatch } from "@/lib/types/domain";
import { useAuthStore } from "@/stores/auth-store";

type TraceTarget = {
  productId: string;
  id: string;
  label?: string;
  productName?: string;
  expiryDate?: string | null;
};

function openTrace(b: HubBatch): TraceTarget | null {
  const productId = b.productId ?? b.product?.id;
  if (!productId) return null;
  const productName = b.product?.name ?? b.productName ?? undefined;
  return {
    productId,
    id: b.id,
    label: b.batchNumber ?? b.id.slice(0, 8),
    productName,
    expiryDate: b.expiryDate,
  };
}

export default function BatchesPage() {
  const activeBranchId = useActiveBranchId();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = canManageStockTakes(role);
  const [rows, setRows] = useState<HubBatch[]>([]);
  const [expiring, setExpiring] = useState<HubBatch[]>([]);
  const [expired, setExpired] = useState<HubBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<HubBatch | null>(null);
  const [editTarget, setEditTarget] = useState<HubBatch | null>(null);
  const [traceBatch, setTraceBatch] = useState<TraceTarget | null>(null);

  const showTrace = useCallback((b: HubBatch) => {
    const target = openTrace(b);
    if (target) {
      setTraceBatch(target);
      return;
    }
    toast.error("Product information is missing for this batch.");
  }, []);

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

  async function confirmRemoveExpired() {
    if (!removeTarget) return;
    const id = removeTarget.id;
    setWorkingId(id);
    try {
      await removeExpiredBatch(id);
      toast.success("Batch marked and stock updated");
      setRemoveTarget(null);
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
                      <p className="font-medium">{b.product?.name ?? b.productName ?? "Product"}</p>
                      <p className="text-xs text-muted-foreground">
                        Batch {b.batchNumber ?? b.id.slice(0, 8)} · expired {b.expiryDate ? formatDateDMY(b.expiryDate) : "-"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {canEdit ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="min-h-9"
                          onClick={() => setEditTarget(b)}
                        >
                          Edit
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="min-h-9"
                        onClick={() => showTrace(b)}
                      >
                        View trace
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="min-h-9"
                        disabled={workingId === b.id}
                        onClick={() => setRemoveTarget(b)}
                      >
                        {workingId === b.id ? "Working…" : "Remove from stock"}
                      </Button>
                    </div>
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
                    <p className="font-medium">{b.product?.name ?? b.productName ?? "Product"}</p>
                    <p className="text-xs text-muted-foreground">
                      Batch {b.batchNumber ?? "-"} · expires {b.expiryDate ? formatDateDMY(b.expiryDate) : "-"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-0 text-xs text-primary"
                          onClick={() => setEditTarget(b)}
                        >
                          Edit
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-0 text-xs text-primary"
                        onClick={() => showTrace(b)}
                      >
                        View trace
                      </Button>
                      {b.product?.id ? (
                        <Link className="inline-block text-xs font-medium text-primary underline-offset-2 hover:underline" href={`/products/${b.product.id}`}>
                          View product
                        </Link>
                      ) : b.productId ? (
                        <Link className="inline-block text-xs font-medium text-primary underline-offset-2 hover:underline" href={`/products/${b.productId}`}>
                          View product
                        </Link>
                      ) : null}
                    </div>
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
          <CardDescription>Tap a row to see where that batch went.</CardDescription>
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
                  {canEdit ? <TableHead className="w-[88px]">Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => (
                  <TableRow
                    key={b.id}
                    className="interactive-cursor"
                    role="button"
                    tabIndex={0}
                    aria-label={`View batch trace for ${b.batchNumber ?? b.id.slice(0, 8)}`}
                    onClick={() => showTrace(b)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        showTrace(b);
                      }
                    }}
                  >
                    <TableCell className="font-medium">
                      {(() => {
                        const productId = b.productId ?? b.product?.id;
                        const productName = b.product?.name ?? b.productName;
                        if (productId && productName) {
                          return (
                            <Link
                              className="text-primary underline-offset-2 hover:underline"
                              href={`/products/${productId}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {productName}
                            </Link>
                          );
                        }
                        if (productName) return productName;
                        return "-";
                      })()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{b.branchName ?? "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{b.batchNumber ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{String(b.remainingQuantity ?? b.quantity ?? "-")}</TableCell>
                    <TableCell>{b.expiryDate ? formatDateDMY(b.expiryDate) : "-"}</TableCell>
                    <TableCell>
                      {b.isExpired ? <Badge variant="destructive">Expired</Badge> : <Badge variant="secondary">OK</Badge>}
                    </TableCell>
                    {canEdit ? (
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditTarget(b);
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove expired batch from stock?</DialogTitle>
            <DialogDescription>
              This permanently writes off the remaining quantity for this batch. Stock levels will drop and this
              cannot be undone from the hub. Only confirm after you have physically disposed of the goods.
            </DialogDescription>
          </DialogHeader>
          {removeTarget ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-foreground">
                {removeTarget.product?.name ?? removeTarget.productName ?? "Product"}
              </p>
              <p className="text-xs text-muted-foreground">
                Batch {removeTarget.batchNumber ?? removeTarget.id.slice(0, 8)}
                {" · "}
                {String(removeTarget.remainingQuantity ?? removeTarget.quantity ?? "?")} units
                {removeTarget.expiryDate ? ` · expired ${formatDateDMY(removeTarget.expiryDate)}` : ""}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoveTarget(null)} disabled={workingId !== null}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={workingId !== null}
              onClick={() => void confirmRemoveExpired()}
            >
              {workingId ? "Removing…" : "Remove from stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BatchEditDialog
        batch={editTarget}
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onSaved={load}
      />

      <BatchTraceDrawer
        productId={traceBatch?.productId ?? null}
        batchId={traceBatch?.id ?? null}
        batchLabel={traceBatch?.label}
        productName={traceBatch?.productName}
        expiryDate={traceBatch?.expiryDate}
        open={!!traceBatch}
        onOpenChange={(open) => {
          if (!open) setTraceBatch(null);
        }}
      />
    </div>
  );
}
