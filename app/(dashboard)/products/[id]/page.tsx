"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Copy, Link2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteProductConversion,
  fetchProductConversions,
  updateProductConversion,
} from "@/lib/api/product-conversions";
import { deleteProduct, duplicateProduct, fetchProduct, fetchStockHistory } from "@/lib/api/products";
import { handleApiError } from "@/lib/api/errors";
import { canManageInventoryConversions } from "@/lib/inventory-access";
import type { ProductConversion } from "@/lib/types/conversions";
import { formatCurrency } from "@/lib/format";
import { formatDateDMY, formatTime12h } from "@/lib/format";
import { productCategoryLabel } from "@/lib/product-helpers";
import { getStockStatus, productQuantity, productReorderLevel } from "@/lib/stock-status";
import { useAuthStore } from "@/stores/auth-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HubProduct, HubStockAdjustment } from "@/lib/types/domain";
import { cn } from "@/lib/utils";
import { InventoryEventHistorySheet } from "@/components/inventory/inventory-event-history-sheet";

type Tab = "batches" | "history" | "sales";

function stockBadgeClass(tone: ReturnType<typeof getStockStatus>) {
  if (tone === "out") return "bg-destructive/15 text-destructive border-destructive/30";
  if (tone === "low") return "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100";
  return "border-emerald-600/30 bg-emerald-600/10 text-emerald-900 dark:text-emerald-100";
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const currency = useAuthStore((s) => s.organization?.currency) ?? "GHS";
  const role = useAuthStore((s) => s.user?.role);
  const canConv = canManageInventoryConversions(role);

  const [product, setProduct] = useState<HubProduct | null>(null);
  const [history, setHistory] = useState<HubStockAdjustment[]>([]);
  const [tab, setTab] = useState<Tab>("batches");
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editConv, setEditConv] = useState<ProductConversion | null>(null);
  const [editRatio, setEditRatio] = useState("");
  const [savingRatio, setSavingRatio] = useState(false);
  const [deleteConvId, setDeleteConvId] = useState<string | null>(null);
  const [deletingConv, setDeletingConv] = useState(false);

  const conversionsQuery = useQuery({
    queryKey: ["product-conversions", id],
    queryFn: () => fetchProductConversions(id),
    enabled: !!id && !!product,
    staleTime: 30_000,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await fetchProduct(id);
      setProduct(p);
    } catch (e) {
      toast.error(handleApiError(e));
      router.push("/products");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab !== "history" || !id) return;
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      try {
        const h = await fetchStockHistory(id);
        if (!cancelled) setHistory(h);
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, id]);

  async function onDuplicate() {
    try {
      const p = await duplicateProduct(id);
      toast.success("Copy created");
      router.push(`/products/${p.id}`);
    } catch (e) {
      toast.error(handleApiError(e));
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await deleteProduct(id);
      toast.success("Product removed");
      router.push("/products");
    } catch (e) {
      toast.error(handleApiError(e));
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function onSaveRatio() {
    if (!editConv) return;
    const n = parseFloat(editRatio);
    if (!Number.isFinite(n) || n < 0.001) {
      toast.error("Enter a valid ratio (minimum 0.001).");
      return;
    }
    setSavingRatio(true);
    try {
      await updateProductConversion(editConv.id, { conversionRatio: n });
      toast.success("Conversion ratio updated");
      setEditConv(null);
      void queryClient.invalidateQueries({ queryKey: ["product-conversions", id] });
    } catch (e) {
      toast.error(handleApiError(e));
    } finally {
      setSavingRatio(false);
    }
  }

  async function onConfirmDeleteConv() {
    if (!deleteConvId) return;
    setDeletingConv(true);
    try {
      await deleteProductConversion(deleteConvId);
      toast.success("Packaging link removed");
      setDeleteConvId(null);
      void queryClient.invalidateQueries({ queryKey: ["product-conversions", id] });
    } catch (e) {
      toast.error(handleApiError(e));
    } finally {
      setDeletingConv(false);
    }
  }

  if (loading || !product) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const q = productQuantity(product);
  const tone = getStockStatus(q, productReorderLevel(product));
  const cost = Number(product.costPrice ?? 0);
  const sell = Number(product.sellingPrice ?? 0);
  const marginPct = cost > 0 && Number.isFinite(sell) ? ((sell - cost) / cost) * 100 : null;
  const batches = product.batches ?? [];
  const convData = conversionsQuery.data;
  const convLoading = conversionsQuery.isPending;
  const asParent = convData?.asParent ?? [];
  const asChild = convData?.asChild ?? [];
  const hasAnyConv =
    asParent.some((c) => c.isActive && c.childProduct) ||
    asChild.some((c) => c.isActive && c.parentProduct);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" className="min-h-9" render={<Link href="/products" />}>
          All products
        </Button>
        <div className="flex flex-wrap gap-2">
          <InventoryEventHistorySheet productId={id} />
          <Button type="button" variant="outline" size="sm" className="min-h-9" onClick={() => void onDuplicate()}>
            <Copy className="size-4" aria-hidden />
            Duplicate
          </Button>
          <Button type="button" size="sm" className="min-h-9" render={<Link href={`/products/${id}/edit`} />}>
            <Pencil className="size-4" aria-hidden />
            Edit
          </Button>
          <Button type="button" variant="destructive" size="sm" className="min-h-9" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" aria-hidden />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-border/40 bg-card/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">{product.name}</CardTitle>
            <CardDescription className="font-mono text-xs">
              SKU: {product.sku ?? "-"} · Barcode: {product.barcode ?? "-"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="font-medium">{productCategoryLabel(product)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Stock</p>
              <Badge variant="outline" className={cn("mt-1 tabular-nums", stockBadgeClass(tone))}>
                {Number.isFinite(q) ? q : "-"} units
              </Badge>
              {product.reorderLevel != null ? (
                <p className="mt-1 text-muted-foreground">Reorder at: {String(product.reorderLevel)}</p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-border/40 pt-4">
              <div>
                <p className="text-muted-foreground">Cost</p>
                <p className="font-medium tabular-nums">{formatCurrency(Number.isFinite(cost) ? cost : 0, currency)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Selling price</p>
                <p className="font-medium tabular-nums">{formatCurrency(Number.isFinite(sell) ? sell : 0, currency)}</p>
              </div>
            </div>
            {marginPct != null && Number.isFinite(marginPct) ? (
              <p className="text-muted-foreground">
                Markup on cost: <span className="font-medium text-foreground">{marginPct.toFixed(0)}%</span>
              </p>
            ) : null}
            {product.createdAt ? (
              <p className="text-xs text-muted-foreground">
                Added {formatDateDMY(product.createdAt)} · Updated{" "}
                {product.updatedAt ? formatDateDMY(product.updatedAt) : "-"}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/80 shadow-sm lg:col-span-3">
          <CardHeader className="border-b border-border/30 pb-3">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "batches" as const, label: "Batches" },
                  { key: "history" as const, label: "Stock history" },
                  { key: "sales" as const, label: "Sales (soon)" },
                ] as const
              ).map(({ key, label }) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={tab === key ? "secondary" : "ghost"}
                  className="min-h-9"
                  onClick={() => setTab(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {tab === "batches" ? (
              batches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No batches recorded for this product yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs">{b.batchNumber ?? b.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-right tabular-nums">{String(b.remainingQuantity ?? b.quantity ?? "-")}</TableCell>
                        <TableCell>{b.expiryDate ? formatDateDMY(b.expiryDate) : "-"}</TableCell>
                        <TableCell>
                          {b.isExpired ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            ) : null}
            {tab === "history" ? (
              historyLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stock movements recorded yet.</p>
              ) : (
                <ul className="space-y-4">
                  {history.map((h) => {
                    const when = h.createdAt;
                    const by = h.user
                      ? [h.user.firstName, h.user.lastName].filter(Boolean).join(" ") || h.user.email
                      : "-";
                    const change = Number(h.quantityChange ?? 0);
                    return (
                      <li key={h.id} className="rounded-lg border border-border/40 bg-muted/20 p-3 text-sm">
                        <p className="font-medium text-foreground">
                          {when ? `${formatDateDMY(when)} · ${formatTime12h(when)}` : "-"}
                        </p>
                        <p className="text-muted-foreground">
                          {h.type?.replace(/_/g, " ") ?? "Adjustment"}{" "}
                          <span className={change >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}>
                            {change >= 0 ? "+" : ""}
                            {change}
                          </span>{" "}
                          units
                        </p>
                        <p className="text-xs text-muted-foreground">By {by}</p>
                        {h.notes ? <p className="mt-1 text-xs">{h.notes}</p> : null}
                      </li>
                    );
                  })}
                </ul>
              )
            ) : null}
            {tab === "sales" ? (
              <p className="text-sm text-muted-foreground">Sales performance for this product will appear here.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="size-4 shrink-0" aria-hidden />
            Linked products
          </CardTitle>
          <CardDescription>Pack and singles linked for inventory conversion.</CardDescription>
        </CardHeader>
        <CardContent>
          {convLoading ? (
            <p className="text-sm text-muted-foreground">Loading links…</p>
          ) : !hasAnyConv ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <p>No linked products</p>
              {canConv ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 min-h-9"
                  render={<Link href={`/products/${id}/edit#packaging`} />}
                >
                  Set up conversion
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-6">
              {asParent.filter((c) => c.isActive && c.childProduct).length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">This pack breaks down into</p>
                  {asParent
                    .filter((c) => c.isActive && c.childProduct)
                    .map((conv) => (
                      <div
                        key={conv.id}
                        className="flex flex-col gap-3 rounded-lg border border-border/40 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">
                            <Link href={`/products/${conv.childProduct!.id}`} className="text-primary underline-offset-2 hover:underline">
                              {conv.childProduct!.name}
                            </Link>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {conv.childProduct!.sku ? `SKU: ${conv.childProduct!.sku} · ` : null}
                            1 pack = {conv.conversionRatio} singles
                          </p>
                        </div>
                        {canConv ? (
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-9"
                              onClick={() => {
                                setEditConv(conv);
                                setEditRatio(conv.conversionRatio);
                              }}
                            >
                              Edit ratio
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="min-h-9 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConvId(conv.id)}
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                </div>
              ) : null}
              {asChild.filter((c) => c.isActive && c.parentProduct).length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">This product comes from</p>
                  {asChild
                    .filter((c) => c.isActive && c.parentProduct)
                    .map((conv) => (
                      <div
                        key={conv.id}
                        className="flex flex-col gap-3 rounded-lg border border-border/40 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">
                            <Link href={`/products/${conv.parentProduct!.id}`} className="text-primary underline-offset-2 hover:underline">
                              {conv.parentProduct!.name}
                            </Link>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {conv.parentProduct!.sku ? `SKU: ${conv.parentProduct!.sku} · ` : null}
                            1 pack = {conv.conversionRatio} singles
                          </p>
                        </div>
                        {canConv ? (
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-9"
                              onClick={() => {
                                setEditConv(conv);
                                setEditRatio(conv.conversionRatio);
                              }}
                            >
                              Edit ratio
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="min-h-9 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConvId(conv.id)}
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {product.name}?</DialogTitle>
            <DialogDescription>This cannot be undone. The product will be hidden from new sales.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={deleting} onClick={() => void onDelete()}>
              {deleting ? "Removing…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editConv} onOpenChange={(o) => !o && setEditConv(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit conversion ratio</DialogTitle>
            <DialogDescription>
              {product.name}
              {editConv?.childProduct
                ? ` → ${editConv.childProduct.name}`
                : editConv?.parentProduct
                  ? ` ← ${editConv.parentProduct.name}`
                  : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="detail-ratio">Singles per pack</Label>
              <Input
                id="detail-ratio"
                className="min-h-11"
                inputMode="decimal"
                step={0.001}
                min={0.001}
                value={editRatio}
                onChange={(e) => setEditRatio(e.target.value)}
              />
            </div>
            <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>This affects future conversions only, not past stock movements.</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditConv(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={savingRatio} onClick={() => void onSaveRatio()}>
              {savingRatio ? "Saving…" : "Update ratio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConvId} onOpenChange={(o) => !o && setDeleteConvId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove packaging link?</DialogTitle>
            <DialogDescription>
              You can set it up again from the product edit screen. Past inventory adjustments stay in the log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteConvId(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={deletingConv} onClick={() => void onConfirmDeleteConv()}>
              {deletingConv ? "Removing…" : "Remove link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
