"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchCategories } from "@/lib/api/categories";
import { handleApiError } from "@/lib/api/errors";
import { deleteProduct, promoteFromTemporary } from "@/lib/api/products";
import { useTemporaryItems } from "@/lib/hooks/use-temporary-items";
import { formatCurrency } from "@/lib/format";
import { formatDateDMY, formatTime12h } from "@/lib/format";
import { useAuthStore } from "@/stores/auth-store";
import type { HubCategory } from "@/lib/types/domain";
import type { HubTemporaryItem } from "@/lib/types/phase2";
import { cn } from "@/lib/utils";

/** Whole days since first sale timestamp (for “old item” badge). */
function fullDaysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
}

function TemporaryItemsContent() {
  const currency = useAuthStore((s) => s.organization?.currency) ?? "GHS";
  const searchParams = useSearchParams();
  const highlightProductId =
    searchParams.get("highlightProductId") ?? searchParams.get("productId");
  const highlightAggregateId = searchParams.get("aggregateId");
  const { items, loading, error, reload } = useTemporaryItems();
  const [categories, setCategories] = useState<HubCategory[]>([]);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [selected, setSelected] = useState<HubTemporaryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [ignoreTarget, setIgnoreTarget] = useState<HubTemporaryItem | null>(null);
  const [ignoring, setIgnoring] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cats = await fetchCategories();
        if (!cancelled) setCategories(cats);
      } catch {
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openPromote = useCallback((row: HubTemporaryItem) => {
    setSelected(row);
    setName(String(row.name ?? ""));
    setBarcode(String(row.barcode ?? ""));
    setSellingPrice(
      row.price != null && row.price !== "" ? String(row.price) : "",
    );
    setCostPrice("");
    setStockQuantity("0");
    setCategoryId("");
    setPromoteOpen(true);
  }, []);

  async function onPromoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected?.id) return;
    const cost = parseFloat(costPrice);
    const sell = parseFloat(sellingPrice);
    const stock = parseFloat(stockQuantity);
    if (!categoryId) {
      toast.error("Choose a category.");
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      toast.error("Enter a valid cost price.");
      return;
    }
    if (!Number.isFinite(sell) || sell < 0) {
      toast.error("Enter a valid selling price.");
      return;
    }
    if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
      toast.error("Stock quantity must be a whole number (0 or more).");
      return;
    }
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    if (!barcode.trim()) {
      toast.error("Barcode is required.");
      return;
    }
    setSaving(true);
    try {
      await promoteFromTemporary(selected.id, {
        name: name.trim(),
        cost_price: cost,
        category_id: categoryId,
        stock_quantity: stock,
        barcode: barcode.trim(),
        selling_price: sell,
      });
      toast.success("Product added to inventory.");
      setPromoteOpen(false);
      setSelected(null);
      await reload();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function confirmIgnore() {
    if (!ignoreTarget?.id) return;
    setIgnoring(true);
    try {
      await deleteProduct(ignoreTarget.id);
      toast.success("Temporary item removed from the review queue.");
      setIgnoreTarget(null);
      await reload();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setIgnoring(false);
    }
  }

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const ta = a.firstSoldAt ? new Date(a.firstSoldAt).getTime() : 0;
      const tb = b.firstSoldAt ? new Date(b.firstSoldAt).getTime() : 0;
      return ta - tb;
    });
  }, [items]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Temporary items</h1>
        <p className="text-sm text-muted-foreground">
          Items stay here until you promote them or ignore them - nothing auto-dismisses. Promotion turns the
          placeholder into a normal catalog product.
        </p>
      </div>

      <Card className="border-border/40 bg-card/80 shadow-sm backdrop-blur-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-medium">Pending review</CardTitle>
          <Button type="button" variant="outline" size="sm" className="min-h-9" onClick={() => void reload()}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground">Could not load temporary items.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Qty sold</TableHead>
                  <TableHead>First sold</TableHead>
                  <TableHead className="text-right w-[220px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No temporary items pending.
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map((row) => {
                    const qty = Number(row.quantitySold ?? 0);
                    const price = Number(row.price ?? 0);
                    const days = fullDaysSince(row.firstSoldAt);
                    const highlight =
                      (highlightProductId != null &&
                        highlightProductId !== "" &&
                        String(row.id) === highlightProductId) ||
                      (highlightAggregateId &&
                        row.aggregateId &&
                        String(row.aggregateId) === highlightAggregateId);
                    const when = row.firstSoldAt;
                    return (
                      <TableRow
                        key={row.id}
                        className={cn(
                          "transition-colors hover:bg-muted/40",
                          highlight && "bg-amber-500/10 dark:bg-amber-500/15",
                        )}
                      >
                        <TableCell className="font-mono text-sm">{row.barcode ?? "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{row.name ?? "-"}</span>
                            {days != null && days > 7 ? (
                              <Badge
                                variant="outline"
                                className="border-amber-500/50 bg-amber-500/10 font-normal text-amber-900 dark:text-amber-100"
                              >
                                Sold {days} days ago
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(Number.isFinite(price) ? price : 0, currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number.isFinite(qty) ? qty : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {when ? `${formatDateDMY(when)} · ${formatTime12h(when)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-h-9"
                              onClick={() => setIgnoreTarget(row)}
                            >
                              Ignore
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="min-h-9"
                              onClick={() => openPromote(row)}
                            >
                              Promote to inventory
                            </Button>
                          </div>
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

      <Dialog open={Boolean(ignoreTarget)} onOpenChange={(o) => !o && setIgnoreTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ignore this temporary item?</DialogTitle>
            <DialogDescription>
              This removes the placeholder product from your review queue. You can still add the product later
              from Products if you change your mind.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIgnoreTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={ignoring}
              onClick={() => void confirmIgnore()}
            >
              {ignoring ? "Removing…" : "Ignore / delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={promoteOpen} onOpenChange={setPromoteOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={onPromoteSubmit}>
            <DialogHeader>
              <DialogTitle>Promote to inventory</DialogTitle>
              <DialogDescription>
                Add cost, category, and stock. This creates a permanent product and removes the temporary aggregate when
                the server accepts the request.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ti-name">Name</Label>
                <Input
                  id="ti-name"
                  className="min-h-11"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ti-barcode">Barcode</Label>
                <Input
                  id="ti-barcode"
                  className="min-h-11 font-mono text-sm"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ti-cat">Category</Label>
                <select
                  id="ti-cat"
                  className="flex h-11 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="ti-cost">Cost price</Label>
                  <Input
                    id="ti-cost"
                    className="min-h-11"
                    inputMode="decimal"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ti-sell">Selling price</Label>
                  <Input
                    id="ti-sell"
                    className="min-h-11"
                    inputMode="decimal"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ti-stock">Stock quantity</Label>
                <Input
                  id="ti-stock"
                  className="min-h-11"
                  inputMode="numeric"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPromoteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Promote"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TemporaryItemsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <TemporaryItemsContent />
    </Suspense>
  );
}
