"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { executeBulkConversion, fetchProductConversions } from "@/lib/api/product-conversions";
import { handleApiError } from "@/lib/api/errors";
import type { ConversionDirection, ProductConversion } from "@/lib/types/conversions";
import type { HubProduct } from "@/lib/types/domain";
import { productQuantity } from "@/lib/stock-status";
import { cn } from "@/lib/utils";

function formatQtyLabel(v: string | number | null | undefined): string {
  if (v == null) return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function firstActiveParent(rows: ProductConversion[]): ProductConversion | undefined {
  return rows.find((c) => c.isActive && c.childProduct);
}

function firstActiveChild(rows: ProductConversion[]): ProductConversion | undefined {
  return rows.find((c) => c.isActive && c.parentProduct);
}

export function ConvertProductModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: HubProduct | null;
  onSuccess?: () => void;
}) {
  const { open, onOpenChange, product, onSuccess } = props;
  const [qtyInput, setQtyInput] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const convQuery = useQuery({
    queryKey: ["product-conversions", product?.id],
    queryFn: () => fetchProductConversions(product!.id),
    enabled: open && !!product?.id,
    staleTime: 15_000,
  });

  const packRow = convQuery.data ? firstActiveParent(convQuery.data.asParent) : undefined;
  const singleRow = convQuery.data ? firstActiveChild(convQuery.data.asChild) : undefined;

  const mode = useMemo(() => {
    if (!product) return null;
    if (packRow) {
      return {
        direction: "BULK_TO_SINGLES" as ConversionDirection,
        conversionId: packRow.id,
        ratio: Number(packRow.conversionRatio),
        labelFrom: "pack(s)",
        labelTo: "single(s)",
        otherName: packRow.childProduct?.name ?? "Singles",
        maxPacks: productQuantity(product),
      };
    }
    if (singleRow?.parentProduct) {
      const ratio = Number(singleRow.conversionRatio);
      const singlesQty = productQuantity(product);
      const maxPacks =
        Number.isFinite(ratio) && ratio > 0 && Number.isFinite(singlesQty)
          ? Math.floor(singlesQty / ratio)
          : 0;
      return {
        direction: "SINGLES_TO_BULK" as ConversionDirection,
        conversionId: singleRow.id,
        ratio,
        labelFrom: "pack(s) to assemble",
        labelTo: "single(s) used",
        otherName: singleRow.parentProduct.name,
        maxPacks,
      };
    }
    return null;
  }, [product, packRow, singleRow]);

  useEffect(() => {
    if (!open) {
      setQtyInput("");
      setNotes("");
      setSubmitting(false);
    }
  }, [open]);

  async function handleConvert() {
    if (!product || !mode) return;
    const q = parseFloat(qtyInput);
    if (!Number.isFinite(q) || q <= 0) {
      toast.error("Enter a valid quantity greater than zero.");
      return;
    }
    if (q > mode.maxPacks + 1e-9) {
      toast.error(`You cannot convert more than ${formatQtyLabel(mode.maxPacks)} pack(s) with current stock.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await executeBulkConversion({
        conversionId: mode.conversionId,
        quantity: q,
        direction: mode.direction,
        notes: notes.trim() || undefined,
      });
      const pa = res.parentAdjustment;
      const ca = res.childAdjustment;
      const pb = formatQtyLabel(pa.quantityBefore);
      const paft = formatQtyLabel(pa.quantityAfter);
      const cb = formatQtyLabel(ca.quantityBefore);
      const caft = formatQtyLabel(ca.quantityAfter);
      toast.success(
        mode.direction === "BULK_TO_SINGLES"
          ? `Converted ${formatQtyLabel(q)} pack(s)`
          : `Assembled ${formatQtyLabel(q)} pack(s)`,
        {
          description: `Pack: ${pb} → ${paft} · Singles: ${cb} → ${caft}`,
        },
      );
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(handleApiError(e));
    } finally {
      setSubmitting(false);
    }
  }

  const singlesPreview =
    mode && Number.isFinite(mode.ratio) && Number.isFinite(parseFloat(qtyInput))
      ? parseFloat(qtyInput) * mode.ratio
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,40rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Split/Pack product</DialogTitle>
          <DialogDescription>
            Move stock between pack and singles using your saved conversion ratio.
          </DialogDescription>
        </DialogHeader>

        {!product ? null : convQuery.isPending ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            Loading conversion…
          </div>
        ) : convQuery.isError ? (
          <p className="text-sm text-destructive">{handleApiError(convQuery.error)}</p>
        ) : !mode ? (
          <p className="text-sm text-muted-foreground">This product has no active packaging conversion.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/40 bg-muted/30 p-4 text-sm space-y-2">
              {packRow ? (
                <>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">From (pack)</span>
                    <span className="max-w-[60%] truncate text-right font-medium">{product.name}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">To (singles)</span>
                    <span className="max-w-[60%] truncate text-right font-medium">{packRow.childProduct?.name}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">From (singles)</span>
                    <span className="max-w-[60%] truncate text-right font-medium">{product.name}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">To (pack)</span>
                    <span className="max-w-[60%] truncate text-right font-medium">
                      {singleRow?.parentProduct?.name}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t border-border/40 pt-2">
                <span className="text-muted-foreground">Ratio</span>
                <span className="tabular-nums font-medium">1 pack = {packRow?.conversionRatio ?? singleRow?.conversionRatio} singles</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conv-qty">
                {packRow ? "How many packs to convert?" : "How many packs to assemble?"}
              </Label>
              <Input
                id="conv-qty"
                className="min-h-11"
                inputMode="decimal"
                step={0.001}
                min={0.001}
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                placeholder="e.g. 2"
              />
              <p className="text-xs text-muted-foreground">
                {packRow
                  ? `Available: ${formatQtyLabel(mode.maxPacks)} pack(s)`
                  : `You can assemble up to ${formatQtyLabel(mode.maxPacks)} pack(s) from current singles stock.`}
              </p>
            </div>

            {packRow && singlesPreview != null && Number.isFinite(singlesPreview) ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm dark:bg-primary/10">
                <p className="font-medium text-foreground">This will:</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                  <li>Remove {formatQtyLabel(qtyInput || 0)} pack(s) from inventory</li>
                  <li>Add {formatQtyLabel(singlesPreview)} single(s) to inventory</li>
                </ul>
              </div>
            ) : null}

            {!packRow && mode && Number.isFinite(parseFloat(qtyInput)) && parseFloat(qtyInput) > 0 ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm dark:bg-primary/10">
                <p className="font-medium text-foreground">This will:</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
                  <li>Use {formatQtyLabel(parseFloat(qtyInput) * mode.ratio)} single(s)</li>
                  <li>Add {formatQtyLabel(qtyInput)} pack(s) to inventory</li>
                </ul>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="conv-notes">Notes (optional)</Label>
              <Textarea
                id="conv-notes"
                rows={2}
                placeholder="e.g. Opening cartons for retail sales"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting || !mode || convQuery.isPending}
            className={cn("inline-flex items-center gap-2", submitting && "opacity-80")}
            onClick={() => void handleConvert()}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                Converting…
              </>
            ) : (
              "Convert"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
