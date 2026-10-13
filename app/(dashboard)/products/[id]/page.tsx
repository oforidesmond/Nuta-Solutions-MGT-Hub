"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeftRight, Copy, Link2, Pencil, Trash2 } from "lucide-react";
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
import {
  deleteProduct,
  duplicateProduct,
  fetchProduct,
  updateProductPricing,
} from "@/lib/api/products";
import { handleApiError } from "@/lib/api/errors";
import { getApiErrorMessage } from "@/lib/api/error-codes";
import { canManageInventoryConversions, canManageStockTakes } from "@/lib/inventory-access";
import { canManageBranches } from "@/lib/branch-access";
import type { ProductConversion } from "@/lib/types/conversions";
import { formatCurrency, toNumericAmount } from "@/lib/format";
import { formatDateDMY } from "@/lib/format";
import { productCategoryLabel } from "@/lib/product-helpers";
import { getStockStatus, productQuantity, productReorderLevel } from "@/lib/stock-status";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { useAppNavigate } from "@/lib/hooks/use-app-navigate";
import { withBranchKey } from "@/lib/query/branch-query-keys";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BatchTraceDrawer } from "@/components/batches/batch-trace-drawer";
import { BatchEditDialog } from "@/components/batches/batch-edit-dialog";
import { ConvertProductModal } from "@/components/inventory/convert-product-modal";
import { ProductActivityTab } from "@/components/products/product-activity-tab";
import type { HubBatch, HubProduct } from "@/lib/types/domain";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

type Tab = "batches" | "activity";

function stockBadgeClass(tone: ReturnType<typeof getStockStatus>) {
  if (tone === "out") return "bg-destructive/15 text-destructive border-destructive/30";
  if (tone === "low") return "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100";
  return "border-emerald-600/30 bg-emerald-600/10 text-emerald-900 dark:text-emerald-100";
}

export default function ProductDetailPage() {
  const params = useParams();
  const { navigate } = useAppNavigate();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const activeBranchId = useActiveBranchId();
  const currency = useAuthStore((s) => s.organization?.currency) ?? "GHS";
  const role = useAuthStore((s) => s.user?.role);
  const canConv = canManageInventoryConversions(role);
  const canStockTake = canManageStockTakes(role);

  const [product, setProduct] = useState<HubProduct | null>(null);
  const [tab, setTab] = useState<Tab>("batches");
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editConv, setEditConv] = useState<ProductConversion | null>(null);
  const [editRatio, setEditRatio] = useState("");
  const [editAutoConvert, setEditAutoConvert] = useState(false);
  const [savingRatio, setSavingRatio] = useState(false);
  const [deleteConvId, setDeleteConvId] = useState<string | null>(null);
  const [deletingConv, setDeletingConv] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [resetPriceOpen, setResetPriceOpen] = useState(false);
  const [resettingPrice, setResettingPrice] = useState(false);
  const [traceBatch, setTraceBatch] = useState<{
    productId: string;
    id: string;
    label?: string;
    productName?: string;
    expiryDate?: string | null;
  } | null>(null);
  const [editBatch, setEditBatch] = useState<HubBatch | null>(null);

  const conversionsQuery = useQuery({
    queryKey: withBranchKey(activeBranchId, "product-conversions", id),
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
      navigate("/products");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, activeBranchId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDuplicate() {
    try {
      const p = await duplicateProduct(id);
      toast.success("Copy created");
      navigate(`/products/${p.id}`);
    } catch (e) {
      toast.error(handleApiError(e));
    }
  }

  async function onDelete() {
    setDeleting(true);
    try {
      await deleteProduct(id);
      toast.success("Product removed");
      navigate("/products");
    } catch (e) {
      toast.error(handleApiError(e));
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function onSaveConversion() {
    if (!editConv) return;
    const n = parseFloat(editRatio);
    if (!Number.isFinite(n) || n < 0.001) {
      toast.error("Enter a valid ratio (minimum 0.001).");
      return;
    }
    setSavingRatio(true);
    try {
      await updateProductConversion(editConv.id, {
        conversionRatio: n,
        autoConvertOnSale: editAutoConvert,
      });
      toast.success("Packaging link updated");
      setEditConv(null);
      void queryClient.invalidateQueries({
        queryKey: withBranchKey(activeBranchId, "product-conversions", id),
      });
    } catch (e) {
      toast.error(handleApiError(e));
    } finally {
      setSavingRatio(false);
    }
  }

  async function onResetBranchPrice() {
    setResettingPrice(true);
    try {
      await updateProductPricing(id, {
        costPrice: null,
        sellingPrice: null,
        priceScope: "BRANCH",
      });
      toast.success("Branch prices reset to the org default");
      setResetPriceOpen(false);
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setResettingPrice(false);
    }
  }

  async function onConfirmDeleteConv() {
    if (!deleteConvId) return;
    setDeletingConv(true);
    try {
      await deleteProductConversion(deleteConvId);
      toast.success("Packaging link removed");
      setDeleteConvId(null);
      void queryClient.invalidateQueries({
        queryKey: withBranchKey(activeBranchId, "product-conversions", id),
      });
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
            <div className="space-y-3 border-t border-border/40 pt-4">
              {product.hasBranchPriceOverride ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="secondary">Branch price in effect</Badge>
                  {canManageBranches(role) ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setResetPriceOpen(true)}
                    >
                      Reset to org default
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Cost</p>
                  <p className="font-medium tabular-nums">{formatCurrency(Number.isFinite(cost) ? cost : 0, currency)}</p>
                  {product.hasBranchPriceOverride && product.orgCostPrice != null ? (
                    <p className="text-xs text-muted-foreground">
                      Org: {formatCurrency(toNumericAmount(product.orgCostPrice), currency)}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-muted-foreground">Selling price</p>
                  <p className="font-medium tabular-nums">{formatCurrency(Number.isFinite(sell) ? sell : 0, currency)}</p>
                  {product.hasBranchPriceOverride && product.orgSellingPrice != null ? (
                    <p className="text-xs text-muted-foreground">
                      Org: {formatCurrency(toNumericAmount(product.orgSellingPrice), currency)}
                    </p>
                  ) : null}
                </div>
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
                  { key: "activity" as const, label: "Activity" },
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
                      {canStockTake ? <TableHead className="w-[88px]">Actions</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((b) => (
                      <TableRow
                        key={b.id}
                        className="interactive-cursor"
                        role="button"
                        tabIndex={0}
                        aria-label={`View batch trace for ${b.batchNumber ?? b.id.slice(0, 8)}`}
                        onClick={() =>
                          setTraceBatch({
                            productId: id,
                            id: b.id,
                            label: b.batchNumber ?? b.id.slice(0, 8),
                            productName: product.name,
                            expiryDate: b.expiryDate,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setTraceBatch({
                              productId: id,
                              id: b.id,
                              label: b.batchNumber ?? b.id.slice(0, 8),
                              productName: product.name,
                              expiryDate: b.expiryDate,
                            });
                          }
                        }}
                      >
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
                        {canStockTake ? (
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditBatch({
                                  ...b,
                                  productId: id,
                                  productName: product.name,
                                });
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
              )
            ) : null}
            {tab === "activity" ? (
              <ProductActivityTab
                productId={id}
                productName={product?.name}
                enabled={tab === "activity"}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 bg-card/80 shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="size-4 shrink-0" aria-hidden />
              Linked products
            </CardTitle>
            <CardDescription>Pack and singles linked for inventory conversion.</CardDescription>
          </div>
          {canConv && !convLoading && hasAnyConv ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-9 shrink-0 self-start"
              onClick={() => setConvertOpen(true)}
            >
              <ArrowLeftRight className="size-4" aria-hidden />
              Convert stock
            </Button>
          ) : null}
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
                          {conv.autoConvertOnSale ? (
                            <Badge variant="secondary" className="mt-1.5 font-normal">
                              Auto-convert on sale
                            </Badge>
                          ) : null}
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
                                setEditAutoConvert(conv.autoConvertOnSale);
                              }}
                            >
                              Edit link
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
                          {conv.autoConvertOnSale ? (
                            <Badge variant="secondary" className="mt-1.5 font-normal">
                              Auto-convert on sale
                            </Badge>
                          ) : null}
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
                                setEditAutoConvert(conv.autoConvertOnSale);
                              }}
                            >
                              Edit link
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
            <DialogTitle>Edit packaging link</DialogTitle>
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
            <div className="flex items-start gap-2 rounded-lg border border-border/40 p-3">
              <Checkbox
                id="detail-auto-convert"
                checked={editAutoConvert}
                onCheckedChange={(v) => setEditAutoConvert(v === true)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor="detail-auto-convert" className="text-sm font-medium">
                  Auto-convert on sale
                </Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, selling the unit/portion with low stock automatically converts from
                  the linked pack if pack stock allows.
                </p>
              </div>
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
            <Button type="button" disabled={savingRatio} onClick={() => void onSaveConversion()}>
              {savingRatio ? "Saving…" : "Save"}
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

      <ConvertProductModal
        open={convertOpen}
        onOpenChange={setConvertOpen}
        product={product}
        onSuccess={() => {
          void load();
          void queryClient.invalidateQueries({
        queryKey: withBranchKey(activeBranchId, "product-conversions", id),
      });
        }}
      />

      <Dialog open={resetPriceOpen} onOpenChange={setResetPriceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset to org default price?</DialogTitle>
            <DialogDescription>
              This removes the branch-specific price for {product.name}. This branch will use your
              organisation&apos;s default price again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResetPriceOpen(false)} disabled={resettingPrice}>
              Cancel
            </Button>
            <Button type="button" disabled={resettingPrice} onClick={() => void onResetBranchPrice()}>
              {resettingPrice ? "Resetting…" : "Reset to org default"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BatchEditDialog
        batch={editBatch}
        open={!!editBatch}
        onOpenChange={(open) => {
          if (!open) setEditBatch(null);
        }}
        onSaved={load}
      />

      <BatchTraceDrawer
        productId={traceBatch?.productId ?? id}
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
