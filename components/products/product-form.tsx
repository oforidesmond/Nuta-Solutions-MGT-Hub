"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ProductLinkPicker, type ProductPickValue } from "@/components/products/product-link-picker";
import { createBatch } from "@/lib/api/batches";
import { fetchCategories } from "@/lib/api/categories";
import {
  createProductConversion,
  deleteProductConversion,
  fetchProductConversions,
  updateProductConversion,
} from "@/lib/api/product-conversions";
import { createProduct, fetchProduct, updateProduct, type ProductWriteBody } from "@/lib/api/products";
import { handleApiError } from "@/lib/api/errors";
import { canManageInventoryConversions } from "@/lib/inventory-access";
import type { HubCategory, HubProduct } from "@/lib/types/domain";
import { productQuantity } from "@/lib/stock-status";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

type ProductFormProps = {
  mode: "create" | "edit";
  productId?: string;
};

type ConversionSnapshot = {
  id: string;
  parentProductId: string;
  childProductId: string;
  ratioStr: string;
};

export function ProductForm({ mode, productId }: ProductFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const canConv = canManageInventoryConversions(role);

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

  const [packagingOpen, setPackagingOpen] = useState(false);
  const [hasConversion, setHasConversion] = useState(false);
  const [conversionType, setConversionType] = useState<"isParent" | "isChild">("isParent");
  const [linkedPick, setLinkedPick] = useState<ProductPickValue | null>(null);
  const [conversionRatioStr, setConversionRatioStr] = useState("");
  const [convSnapshot, setConvSnapshot] = useState<ConversionSnapshot | null>(null);
  const hydratedForProduct = useRef<string | null>(null);

  const conversionsQuery = useQuery({
    queryKey: ["product-conversions", productId],
    queryFn: () => {
      if (!productId) throw new Error("missing id");
      return fetchProductConversions(productId);
    },
    enabled: mode === "edit" && !!productId,
    staleTime: 30_000,
  });

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#packaging") {
      setPackagingOpen(true);
    }
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

  useEffect(() => {
    if (mode === "create") {
      hydratedForProduct.current = null;
      setHasConversion(false);
      setLinkedPick(null);
      setConversionRatioStr("");
      setConvSnapshot(null);
      setConversionType("isParent");
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "edit" || !productId || !conversionsQuery.data) return;
    if (hydratedForProduct.current === productId) return;
    hydratedForProduct.current = productId;

    const { asParent, asChild } = conversionsQuery.data;
    const activeParent = asParent.find((c) => c.isActive && c.childProduct);
    const activeChild = asChild.find((c) => c.isActive && c.parentProduct);

    if (activeParent?.childProduct && productId) {
      setHasConversion(true);
      setConversionType("isParent");
      setLinkedPick({
        id: activeParent.childProduct.id,
        name: activeParent.childProduct.name,
      });
      setConversionRatioStr(activeParent.conversionRatio);
      setConvSnapshot({
        id: activeParent.id,
        parentProductId: productId,
        childProductId: activeParent.childProduct.id,
        ratioStr: activeParent.conversionRatio,
      });
    } else if (activeChild?.parentProduct && productId) {
      setHasConversion(true);
      setConversionType("isChild");
      setLinkedPick({
        id: activeChild.parentProduct.id,
        name: activeChild.parentProduct.name,
      });
      setConversionRatioStr(activeChild.conversionRatio);
      setConvSnapshot({
        id: activeChild.id,
        parentProductId: activeChild.parentProduct.id,
        childProductId: productId,
        ratioStr: activeChild.conversionRatio,
      });
    } else {
      setHasConversion(false);
      setLinkedPick(null);
      setConversionRatioStr("");
      setConvSnapshot(null);
    }
  }, [mode, productId, conversionsQuery.data]);

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

    if (canConv && hasConversion) {
      if (!linkedPick) next.packaging = "Choose a linked product.";
      const ratio = parseFloat(conversionRatioStr);
      if (!Number.isFinite(ratio) || ratio < 0.001) {
        next.packaging = "Enter singles per pack (minimum 0.001).";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function currentPair(savedId: string): { parentId: string; childId: string } | null {
    if (!linkedPick) return null;
    if (conversionType === "isParent") {
      return { parentId: savedId, childId: linkedPick.id };
    }
    return { parentId: linkedPick.id, childId: savedId };
  }

  async function syncPackaging(saved: HubProduct): Promise<void> {
    if (!canConv) return;

    const savedId = saved.id;
    const pair = currentPair(savedId);

    if (convSnapshot && !hasConversion) {
      try {
        await deleteProductConversion(convSnapshot.id);
        setConvSnapshot(null);
        void queryClient.invalidateQueries({ queryKey: ["product-conversions", savedId] });
        toast.success("Packaging link removed");
      } catch (e) {
        toast.error(handleApiError(e));
      }
      return;
    }

    if (!hasConversion || !pair || !linkedPick) return;

    if (pair.parentId === pair.childId) {
      toast.error("Pack and singles must be different products.");
      return;
    }

    const ratio = parseFloat(conversionRatioStr);
    if (!Number.isFinite(ratio) || ratio < 0.001) {
      toast.error("Enter a valid conversion ratio (minimum 0.001).");
      return;
    }

    const runCreate = async () => {
      const created = await createProductConversion({
        parentProductId: pair.parentId,
        childProductId: pair.childId,
        conversionRatio: ratio,
      });
      setConvSnapshot({
        id: created.id,
        parentProductId: pair.parentId,
        childProductId: pair.childId,
        ratioStr: String(ratio),
      });
      void queryClient.invalidateQueries({ queryKey: ["product-conversions", savedId] });
    };

    try {
      if (convSnapshot?.id) {
        const samePair =
          convSnapshot.parentProductId === pair.parentId &&
          convSnapshot.childProductId === pair.childId;
        if (samePair) {
          if (convSnapshot.ratioStr !== conversionRatioStr.trim()) {
            await updateProductConversion(convSnapshot.id, { conversionRatio: ratio });
            setConvSnapshot({ ...convSnapshot, ratioStr: conversionRatioStr.trim() });
            void queryClient.invalidateQueries({ queryKey: ["product-conversions", savedId] });
            toast.success("Conversion ratio updated");
          }
        } else {
          await deleteProductConversion(convSnapshot.id);
          await runCreate();
          toast.success("Packaging link updated");
        }
      } else {
        await runCreate();
        toast.success("Packaging link saved");
      }
    } catch (e) {
      const msg = handleApiError(e);
      toast.warning("Product saved, but packaging was not updated", {
        description: msg,
        action: {
          label: "Retry",
          onClick: () => {
            void (async () => {
              try {
                await createProductConversion({
                  parentProductId: pair.parentId,
                  childProductId: pair.childId,
                  conversionRatio: ratio,
                });
                void queryClient.invalidateQueries({ queryKey: ["product-conversions", savedId] });
                toast.success("Packaging saved");
              } catch (err2) {
                toast.error(handleApiError(err2));
              }
            })();
          },
        },
      });
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (canConv && convSnapshot && !hasConversion) {
      const ok = window.confirm(
        "Remove the packaging link for this product? Inventory will no longer convert between these items.",
      );
      if (!ok) return;
    }

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

      if (canConv) {
        await syncPackaging(saved);
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

  const convLoading = mode === "edit" && !!productId && conversionsQuery.isPending;

  return (
    <form id="packaging" onSubmit={onSubmit} className="space-y-6">
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

      <Collapsible open={packagingOpen} onOpenChange={setPackagingOpen}>
        <Card className="border-border/40 bg-card/80 shadow-sm">
          <CollapsibleTrigger className="flex w-full items-start gap-3 rounded-t-xl p-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="min-w-0 flex-1 space-y-1">
              <CardTitle className="text-base">Product packaging (optional)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Set up bulk-to-singles conversion if this product comes in packs or cartons.
              </p>
            </div>
            <ChevronDown
              className={cn(
                "mt-1 size-5 shrink-0 text-muted-foreground transition-transform",
                packagingOpen && "rotate-180",
              )}
              aria-hidden
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 border-t border-border/40 pt-4">
              {!canConv ? (
                <p className="text-sm text-muted-foreground">
                  Only administrators and managers can set packaging conversions.
                </p>
              ) : convLoading ? (
                <p className="text-sm text-muted-foreground">Loading packaging…</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Checkbox
                      id="pf-has-conv"
                      checked={hasConversion}
                      onCheckedChange={(v) => setHasConversion(v === true)}
                    />
                    <Label htmlFor="pf-has-conv" className="cursor-pointer text-sm font-normal">
                      This product has multiple packaging levels
                    </Label>
                  </div>
                  {errors.packaging ? <p className="text-sm text-destructive">{errors.packaging}</p> : null}

                  {hasConversion ? (
                    <RadioGroup
                      className="gap-4"
                      value={conversionType}
                      onValueChange={(v) => {
                        if (v === "isParent" || v === "isChild") {
                          setConversionType(v);
                          setLinkedPick(null);
                        }
                      }}
                    >
                      <div className="space-y-3 rounded-lg border border-border/40 p-4">
                        <div className="flex items-start gap-2">
                          <RadioGroupItem id="pf-ct-parent" value="isParent" className="mt-0.5" />
                          <div className="min-w-0 flex-1 space-y-1">
                            <Label htmlFor="pf-ct-parent" className="cursor-pointer font-medium">
                              This is the PACK/BULK item
                            </Label>
                            <p className="text-sm text-muted-foreground">It breaks down into singles.</p>
                          </div>
                        </div>
                        {conversionType === "isParent" ? (
                          <div className="ml-6 space-y-3 border-l-2 border-border/60 pl-4">
                            <ProductLinkPicker
                              id="pf-link-singles"
                              label="Link to singles product"
                              placeholder="Search for singles product…"
                              excludeProductId={productId}
                              value={linkedPick}
                              onChange={setLinkedPick}
                            />
                            <div className="space-y-2">
                              <Label htmlFor="pf-ratio-parent">Singles per pack</Label>
                              <Input
                                id="pf-ratio-parent"
                                className="min-h-11"
                                inputMode="decimal"
                                min={0.001}
                                step={0.001}
                                placeholder="e.g. 6"
                                value={conversionRatioStr}
                                onChange={(e) => setConversionRatioStr(e.target.value)}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-3 rounded-lg border border-border/40 p-4">
                        <div className="flex items-start gap-2">
                          <RadioGroupItem id="pf-ct-child" value="isChild" className="mt-0.5" />
                          <div className="min-w-0 flex-1 space-y-1">
                            <Label htmlFor="pf-ct-child" className="cursor-pointer font-medium">
                              This is the SINGLE/UNIT item
                            </Label>
                            <p className="text-sm text-muted-foreground">It comes from a bulk pack.</p>
                          </div>
                        </div>
                        {conversionType === "isChild" ? (
                          <div className="ml-6 space-y-3 border-l-2 border-border/60 pl-4">
                            <ProductLinkPicker
                              id="pf-link-pack"
                              label="Link to pack product"
                              placeholder="Search for pack product…"
                              excludeProductId={productId}
                              value={linkedPick}
                              onChange={setLinkedPick}
                            />
                            <div className="space-y-2">
                              <Label htmlFor="pf-ratio-child">This many singles per pack</Label>
                              <Input
                                id="pf-ratio-child"
                                className="min-h-11"
                                inputMode="decimal"
                                min={0.001}
                                step={0.001}
                                placeholder="e.g. 6"
                                value={conversionRatioStr}
                                onChange={(e) => setConversionRatioStr(e.target.value)}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </RadioGroup>
                  ) : null}
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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
