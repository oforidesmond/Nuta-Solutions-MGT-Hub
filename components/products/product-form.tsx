"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBatch } from "@/lib/api/batches";
import { fetchCategories } from "@/lib/api/categories";
import { createProduct, fetchProduct, updateProduct, type ProductWriteBody } from "@/lib/api/products";
import { handleApiError } from "@/lib/api/errors";
import type { HubCategory, HubProduct } from "@/lib/types/domain";
import { productQuantity } from "@/lib/stock-status";

type ProductFormProps = {
  mode: "create" | "edit";
  productId?: string;
};

export function ProductForm({ mode, productId }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<HubCategory[]>([]);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [initialStock, setInitialStock] = useState("");

  const [trackBatch, setTrackBatch] = useState(false);
  const [batchNumber, setBatchNumber] = useState("");
  const [batchQty, setBatchQty] = useState("");
  const [batchExpiry, setBatchExpiry] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const applyProduct = useCallback(
    (p: HubProduct) => {
      setName(p.name ?? "");
      setSku(p.sku ?? "");
      setBarcode(p.barcode ?? "");
      setDescription(typeof p.description === "string" ? p.description : "");
      setCategoryId(
        p.categoryId ?? (typeof p.category === "object" && p.category ? p.category.id : "") ?? "",
      );
      setCostPrice(p.costPrice != null ? String(p.costPrice) : "");
      setSellingPrice(p.sellingPrice != null ? String(p.sellingPrice) : "");
      setReorderLevel(p.reorderLevel != null ? String(p.reorderLevel) : "");
      setUnit(p.unit ?? p.unitOfMeasure ?? "pcs");
      if (mode === "edit") setInitialStock(String(productQuantity(p)));
    },
    [mode],
  );

  useEffect(() => {
    if (mode !== "edit" || !productId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const p = await fetchProduct(productId);
        if (cancelled) return;
        applyProduct(p);
      } catch (e) {
        toast.error(handleApiError(e));
        router.push("/products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, productId, router, applyProduct]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Product name is required.";
    const cost = parseFloat(costPrice);
    const sell = parseFloat(sellingPrice);
    if (!Number.isFinite(cost) || cost < 0) next.costPrice = "Enter a valid cost price (0 or more).";
    if (!Number.isFinite(sell) || sell < 0) next.sellingPrice = "Enter a valid selling price (0 or more).";
    if (Number.isFinite(cost) && Number.isFinite(sell) && sell < cost) {
      next.sellingPrice = "Selling price is lower than cost. Double-check your numbers.";
    }
    const stock = parseFloat(initialStock);
    if (initialStock !== "" && (!Number.isFinite(stock) || stock < 0)) {
      next.initialStock = "Stock cannot be negative.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const cost = parseFloat(costPrice);
      const sell = parseFloat(sellingPrice);
      const body: ProductWriteBody = {
        name: name.trim(),
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
        description: description.trim() || undefined,
        categoryId: categoryId || undefined,
        costPrice: cost,
        sellingPrice: sell,
        reorderLevel: reorderLevel === "" ? undefined : parseFloat(reorderLevel),
        unit: unit.trim() || undefined,
        unitOfMeasure: unit.trim() || undefined,
      };
      if (initialStock !== "") {
        const q = parseFloat(initialStock);
        if (Number.isFinite(q)) body.currentStock = q;
      }
      let saved: HubProduct;
      if (mode === "create") {
        saved = await createProduct(body);
        toast.success("Product added", {
          action: { label: "View product", onClick: () => router.push(`/products/${saved.id}`) },
        });
      } else if (productId) {
        saved = await updateProduct(productId, body);
        toast.success("Product saved");
      } else {
        return;
      }

      if (
        mode === "create" &&
        trackBatch &&
        batchNumber.trim() &&
        batchExpiry &&
        parseFloat(batchQty) > 0
      ) {
        try {
          await createBatch({
            productId: saved.id,
            batchNumber: batchNumber.trim(),
            quantity: parseFloat(batchQty),
            expiryDate: new Date(batchExpiry).toISOString(),
            costPriceAtPurchase: cost,
          });
          toast.success("First batch saved");
        } catch (be) {
          toast.error(handleApiError(be));
        }
      }

      router.push(`/products/${saved.id}`);
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading product…</p>;
  }

  const costN = parseFloat(costPrice);
  const sellN = parseFloat(sellingPrice);
  const profit =
    Number.isFinite(costN) && Number.isFinite(sellN) ? sellN - costN : null;
  const marginPct =
    profit != null && costN > 0 ? ((sellN - costN) / costN) * 100 : null;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="border-border/40 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Basic information</CardTitle>
          <CardDescription>Name, codes, and category.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="pf-name">Product name *</Label>
            <Input
              id="pf-name"
              className="min-h-11"
              placeholder="e.g. Paracetamol 500mg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!errors.name}
            />
            {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pf-sku">SKU (optional)</Label>
            <Input id="pf-sku" className="min-h-11 font-mono text-sm" value={sku} onChange={(e) => setSku(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pf-barcode">Barcode</Label>
            <Input id="pf-barcode" className="min-h-11 font-mono text-sm" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="pf-cat">Category</Label>
            <select
              id="pf-cat"
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
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="pf-desc">Description</Label>
            <Textarea id="pf-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Pricing</CardTitle>
          <CardDescription>What you pay and what you charge.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pf-cost">Cost price *</Label>
            <Input
              id="pf-cost"
              className="min-h-11"
              inputMode="decimal"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              aria-invalid={!!errors.costPrice}
            />
            {errors.costPrice ? <p className="text-sm text-destructive">{errors.costPrice}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pf-sell">Selling price *</Label>
            <Input
              id="pf-sell"
              className="min-h-11"
              inputMode="decimal"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              aria-invalid={!!errors.sellingPrice}
            />
            {errors.sellingPrice ? <p className="text-sm text-destructive">{errors.sellingPrice}</p> : null}
          </div>
          {profit != null && profit > 0 && marginPct != null ? (
            <div className="rounded-lg border border-emerald-600/20 bg-emerald-600/5 px-3 py-2 text-sm text-emerald-950 sm:col-span-2 dark:text-emerald-100">
              Money you keep on each unit: <strong>GHS {profit.toFixed(2)}</strong> ({marginPct.toFixed(0)}% on cost)
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Inventory</CardTitle>
          <CardDescription>Stock levels and units.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pf-stock">{mode === "create" ? "Starting stock quantity" : "Current stock quantity"}</Label>
            <Input
              id="pf-stock"
              className="min-h-11"
              inputMode="decimal"
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
              placeholder="0"
              aria-invalid={!!errors.initialStock}
            />
            {errors.initialStock ? <p className="text-sm text-destructive">{errors.initialStock}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pf-reorder">Reorder level</Label>
            <Input
              id="pf-reorder"
              className="min-h-11"
              inputMode="decimal"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              placeholder="Alert when stock falls below this"
            />
            <p className="text-xs text-muted-foreground">We will warn you when stock runs low.</p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pf-unit">Unit of measure</Label>
            <Input id="pf-unit" className="min-h-11" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pcs, boxes, bottles…" />
          </div>
        </CardContent>
      </Card>

      {mode === "create" ? (
        <Card className="border-border/40 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Batch &amp; expiry (optional)</CardTitle>
            <CardDescription>Turn on if you track lot numbers or expiry dates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={trackBatch}
                onChange={(e) => setTrackBatch(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Track batches for this product
            </label>
            {trackBatch ? (
              <div className="grid gap-4 border-t border-border/40 pt-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="pf-bn">Batch number</Label>
                  <Input id="pf-bn" className="min-h-11" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pf-be">Expiry date</Label>
                  <Input id="pf-be" type="date" className="min-h-11" value={batchExpiry} onChange={(e) => setBatchExpiry(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pf-bq">Quantity in batch</Label>
                  <Input id="pf-bq" className="min-h-11" inputMode="decimal" value={batchQty} onChange={(e) => setBatchQty(e.target.value)} />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving} className="min-h-11">
          {saving ? "Saving…" : mode === "create" ? "Save product" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
