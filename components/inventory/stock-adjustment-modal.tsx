"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Minus,
  PackagePlus,
  PencilLine,
  Plus,
  type LucideIcon,
} from "lucide-react";
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
import { createInventoryAdjustment } from "@/lib/api/inventory-adjustments";
import { createBatch } from "@/lib/api/batches";
import { handleApiError } from "@/lib/api/errors";
import {
  MIN_BATCH_QUANTITY,
  parseDecimalQtyInput,
  resolveCostPriceAtPurchase,
} from "@/lib/batch-helpers";
import { productQuantity } from "@/lib/stock-status";
import { formatDateDMY } from "@/lib/format";
import type { HubProduct } from "@/lib/types/domain";
import {
  ADJUSTMENT_TYPE_LABELS,
  type InventoryAdjustmentType,
} from "@/lib/types/inventory-adjustments";
import { cn } from "@/lib/utils";

type Step = "choose" | "form" | "confirm";
type CorrectionDirection = "increase" | "decrease";

const ADJUSTMENT_OPTIONS: {
  type: InventoryAdjustmentType;
  label: string;
  description: string;
  icon: LucideIcon;
  notesRequired: boolean;
  placeholder: string;
  submitLabel: string;
}[] = [
  {
    type: "SUPPLIER_ADD",
    label: ADJUSTMENT_TYPE_LABELS.SUPPLIER_ADD,
    description: "Record new inventory received from a supplier or delivery.",
    icon: PackagePlus,
    notesRequired: false,
    placeholder: "e.g. Morning delivery from Accra Distributors",
    submitLabel: "Add stock",
  },
  {
    type: "DAMAGE_EXPIRED_REMOVE",
    label: ADJUSTMENT_TYPE_LABELS.DAMAGE_EXPIRED_REMOVE,
    description: "Write off stock that is damaged, spoiled, or past expiry.",
    icon: AlertTriangle,
    notesRequired: true,
    placeholder: "e.g. Items got wet during storage",
    submitLabel: "Remove stock",
  },
  {
    type: "CORRECT_ENTRY_ERROR",
    label: ADJUSTMENT_TYPE_LABELS.CORRECT_ENTRY_ERROR,
    description: "Fix a mistaken stock entry without a full stock count.",
    icon: PencilLine,
    notesRequired: true,
    placeholder: "e.g. Wrong count entered on Tuesday",
    submitLabel: "Apply correction",
  },
];

function optionForType(type: InventoryAdjustmentType | null) {
  return ADJUSTMENT_OPTIONS.find((o) => o.type === type) ?? null;
}

function parseQtyInput(raw: string): { ok: true; magnitude: number } | { ok: false } {
  const t = raw.trim();
  if (t === "" || t === "+" || t === "-") return { ok: false };
  const normalized = t.startsWith("+") ? t.slice(1) : t;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 1) return { ok: false };
  return { ok: true, magnitude: n };
}

function parseSignedQtyInput(raw: string): {
  ok: true;
  magnitude: number;
  direction: CorrectionDirection;
} | { ok: false } {
  const t = raw.trim();
  if (t === "" || t === "+" || t === "-") return { ok: false };
  let direction: CorrectionDirection = "increase";
  let numStr = t;
  if (t.startsWith("-")) {
    direction = "decrease";
    numStr = t.slice(1);
  } else if (t.startsWith("+")) {
    numStr = t.slice(1);
  }
  const n = Number(numStr);
  if (!Number.isFinite(n) || n < 1) return { ok: false };
  return { ok: true, magnitude: n, direction };
}

function formatSignedChange(change: number): string {
  const sign = change > 0 ? "+" : "";
  return `${sign}${change}`;
}

function computeSignedDelta(
  type: InventoryAdjustmentType,
  magnitude: number,
  direction: CorrectionDirection,
): number {
  if (type === "SUPPLIER_ADD") return magnitude;
  if (type === "DAMAGE_EXPIRED_REMOVE") return -magnitude;
  return direction === "increase" ? magnitude : -magnitude;
}

function isRemovalType(type: InventoryAdjustmentType): boolean {
  return type === "DAMAGE_EXPIRED_REMOVE";
}

function isCorrectionType(type: InventoryAdjustmentType): boolean {
  return type === "CORRECT_ENTRY_ERROR";
}

function isSupplierAddType(type: InventoryAdjustmentType): boolean {
  return type === "SUPPLIER_ADD";
}

export function StockAdjustmentModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: HubProduct | null;
  onAdjusted: () => void | Promise<void>;
}) {
  const { open, onOpenChange, product, onAdjusted } = props;
  const [step, setStep] = useState<Step>("choose");
  const [adjustmentType, setAdjustmentType] = useState<InventoryAdjustmentType | null>(null);
  const [qtyInput, setQtyInput] = useState("1");
  const [correctionDirection, setCorrectionDirection] = useState<CorrectionDirection>("increase");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [trackBatchDelivery, setTrackBatchDelivery] = useState(false);
  const [batchNumber, setBatchNumber] = useState("");
  const [batchExpiry, setBatchExpiry] = useState("");
  const [batchManufactured, setBatchManufactured] = useState("");

  const systemStock = product ? productQuantity(product) : NaN;
  const selectedOption = optionForType(adjustmentType);
  const usesBatchQtyMin =
    adjustmentType === "SUPPLIER_ADD" && trackBatchDelivery;
  const useBatchReceipt =
    adjustmentType === "SUPPLIER_ADD" &&
    trackBatchDelivery &&
    (batchNumber.trim() !== "" || batchExpiry !== "");
  const resolvedCost =
    product && useBatchReceipt ? resolveCostPriceAtPurchase(product) : null;

  useEffect(() => {
    if (!open) {
      setStep("choose");
      setAdjustmentType(null);
      setQtyInput("1");
      setCorrectionDirection("increase");
      setNotes("");
      setTrackBatchDelivery(false);
      setBatchNumber("");
      setBatchExpiry("");
      setBatchManufactured("");
      setSubmitting(false);
    }
  }, [open]);

  const parsedQty = useMemo(() => {
    if (!adjustmentType) return { ok: false as const };
    if (isCorrectionType(adjustmentType)) {
      const t = qtyInput.trim();
      if (t.startsWith("-")) return parseSignedQtyInput(qtyInput);
      if (t.startsWith("+")) return parseSignedQtyInput(qtyInput);
      return parseQtyInput(qtyInput);
    }
    if (usesBatchQtyMin) {
      return parseDecimalQtyInput(qtyInput, MIN_BATCH_QUANTITY);
    }
    return parseQtyInput(qtyInput);
  }, [adjustmentType, qtyInput, usesBatchQtyMin]);

  const effectiveDirection = useMemo((): CorrectionDirection => {
    if (!adjustmentType || !isCorrectionType(adjustmentType)) return correctionDirection;
    const t = qtyInput.trim();
    if (t.startsWith("-")) return "decrease";
    if (t.startsWith("+")) return "increase";
    return correctionDirection;
  }, [adjustmentType, qtyInput, correctionDirection]);

  const magnitude = parsedQty.ok ? parsedQty.magnitude : null;

  const signedDelta = useMemo(() => {
    if (!adjustmentType || magnitude == null) return null;
    return computeSignedDelta(adjustmentType, magnitude, effectiveDirection);
  }, [adjustmentType, magnitude, effectiveDirection]);

  const newStock = useMemo(() => {
    if (!Number.isFinite(systemStock) || signedDelta == null) return null;
    return systemStock + signedDelta;
  }, [systemStock, signedDelta]);

  const overRemoval =
    signedDelta != null &&
    Number.isFinite(systemStock) &&
    signedDelta < 0 &&
    Math.abs(signedDelta) > systemStock;

  const notesTrimmed = notes.trim();
  const notesValid = !selectedOption?.notesRequired || notesTrimmed.length > 0;

  const minMagnitude = usesBatchQtyMin ? MIN_BATCH_QUANTITY : 1;
  const supplierBatchMetaValid =
    !trackBatchDelivery || batchNumber.trim() !== "" || batchExpiry !== "";
  const supplierBatchCostValid = !useBatchReceipt || resolvedCost != null;

  const formValid =
    !!product &&
    !!adjustmentType &&
    parsedQty.ok &&
    magnitude != null &&
    magnitude >= minMagnitude &&
    !overRemoval &&
    notesValid &&
    signedDelta != null &&
    signedDelta !== 0 &&
    supplierBatchMetaValid &&
    supplierBatchCostValid;

  const canDecrement =
    parsedQty.ok &&
    (usesBatchQtyMin
      ? parsedQty.magnitude > MIN_BATCH_QUANTITY
      : parsedQty.magnitude > 1);

  function handleQtyChange(raw: string) {
    setQtyInput(raw);
    if (adjustmentType && isCorrectionType(adjustmentType)) {
      const t = raw.trim();
      if (t.startsWith("-")) setCorrectionDirection("decrease");
      else if (t.startsWith("+")) setCorrectionDirection("increase");
    }
  }

  function handleQtyBlur() {
    if (!adjustmentType) return;
    if (isCorrectionType(adjustmentType)) {
      const t = qtyInput.trim();
      if (t.startsWith("-") || t.startsWith("+")) {
        const parsed = parseSignedQtyInput(qtyInput);
        if (parsed.ok) {
          setCorrectionDirection(parsed.direction);
          setQtyInput(String(parsed.magnitude));
          return;
        }
      } else {
        const parsed = parseQtyInput(qtyInput);
        if (parsed.ok) {
          setQtyInput(String(parsed.magnitude));
          return;
        }
      }
    } else {
      const parsed = usesBatchQtyMin
        ? parseDecimalQtyInput(qtyInput, MIN_BATCH_QUANTITY)
        : parseQtyInput(qtyInput);
      if (parsed.ok) {
        setQtyInput(String(parsed.magnitude));
        return;
      }
    }
    if (qtyInput.trim() === "") setQtyInput("1");
  }

  function incrementQty() {
    const current = parsedQty.ok ? parsedQty.magnitude : 1;
    const next = current + 1;
    if (
      adjustmentType &&
      isRemovalType(adjustmentType) &&
      Number.isFinite(systemStock) &&
      next > systemStock
    ) {
      return;
    }
    if (
      adjustmentType &&
      isCorrectionType(adjustmentType) &&
      effectiveDirection === "decrease" &&
      Number.isFinite(systemStock) &&
      next > systemStock
    ) {
      return;
    }
    setQtyInput(String(next));
  }

  function decrementQty() {
    if (!canDecrement) return;
    const current = parsedQty.ok ? parsedQty.magnitude : usesBatchQtyMin ? MIN_BATCH_QUANTITY : 1;
    const floor = usesBatchQtyMin ? MIN_BATCH_QUANTITY : 1;
    setQtyInput(String(Math.max(floor, current - 1)));
  }

  function selectType(type: InventoryAdjustmentType) {
    setAdjustmentType(type);
    setQtyInput("1");
    setCorrectionDirection("increase");
    setNotes("");
    setTrackBatchDelivery(false);
    setBatchNumber("");
    setBatchExpiry("");
    setBatchManufactured("");
    setStep("form");
  }

  async function handleConfirm() {
    if (!product || !adjustmentType || signedDelta == null || !formValid || magnitude == null) return;
    setSubmitting(true);
    try {
      if (useBatchReceipt) {
        if (magnitude < MIN_BATCH_QUANTITY) return;
        const costPriceAtPurchase = resolveCostPriceAtPurchase(product);
        if (costPriceAtPurchase == null) {
          toast.error("Set a cost price on this product before recording a batch delivery.");
          return;
        }
        await createBatch({
          productId: product.id,
          quantity: magnitude,
          costPriceAtPurchase,
          batchNumber: batchNumber.trim() || undefined,
          expiryDate: batchExpiry ? new Date(batchExpiry).toISOString() : undefined,
          manufacturedDate: batchManufactured
            ? new Date(batchManufactured).toISOString()
            : undefined,
          notes: notesTrimmed || undefined,
        });
        const afterQty = newStock ?? systemStock + magnitude;
        toast.success(`Stock updated - ${afterQty} units of ${product.name} remaining`, {
          description: `Delivery from supplier · +${magnitude} units`,
        });
      } else {
        const row = await createInventoryAdjustment({
          productId: product.id,
          type: adjustmentType,
          quantityChange: signedDelta,
          notes: notesTrimmed || undefined,
        });
        const afterQty = Number(row.quantityAfter ?? newStock ?? systemStock);
        const change = Number(row.quantityChange ?? signedDelta);
        const label = ADJUSTMENT_TYPE_LABELS[adjustmentType];
        toast.success(`Stock updated - ${afterQty} units of ${product.name} remaining`, {
          description: `${label} · ${formatSignedChange(change)} units`,
        });
      }
      onOpenChange(false);
      await onAdjusted();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const dialogTitle =
    step === "choose"
      ? "Adjust stock"
      : step === "form"
        ? selectedOption?.label ?? "Adjust stock"
        : "Confirm adjustment";

  const dialogDescription =
    step === "choose"
      ? "Choose why you are changing stock for this product."
      : step === "form"
        ? selectedOption?.description
        : "Review the details before applying this change.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {step === "choose" && product ? (
          <div className="grid gap-2 py-2">
            <div className="grid gap-1.5 pb-1">
              <Label>Product</Label>
              <p className="text-sm font-medium text-foreground">{product.name}</p>
            </div>
            {ADJUSTMENT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => selectType(opt.type)}
                  className={cn(
                    "interactive-cursor flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                    adjustmentType === opt.type
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:border-border",
                  )}
                  aria-pressed={adjustmentType === opt.type}
                >
                  <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        {step === "form" && product && selectedOption ? (
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Product</Label>
              <p className="text-sm font-medium text-foreground">{product.name}</p>
            </div>
            <div className="grid gap-1.5">
              <Label>SKU</Label>
              <p className="font-mono text-sm text-muted-foreground">
                {product.sku?.trim() ? product.sku : "-"}
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label>Current system stock</Label>
              <p className="tabular-nums text-sm font-medium">
                {Number.isFinite(systemStock) ? systemStock : "-"}
              </p>
            </div>

            {isCorrectionType(adjustmentType!) ? (
              <div className="space-y-2">
                <Label>Direction</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: "increase" as const, label: "Increase" },
                      { value: "decrease" as const, label: "Decrease" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCorrectionDirection(opt.value)}
                      className={cn(
                        "interactive-cursor rounded-lg border p-2.5 text-left transition-colors",
                        effectiveDirection === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border/60 hover:border-border",
                      )}
                      aria-pressed={effectiveDirection === opt.value}
                    >
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-1.5">
              <Label htmlFor="adj-qty">Quantity</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="min-h-12 min-w-12 shrink-0"
                  aria-label="Decrease quantity"
                  disabled={!canDecrement}
                  onClick={decrementQty}
                >
                  <Minus className="size-5" aria-hidden />
                </Button>
                <Input
                  id="adj-qty"
                  inputMode={usesBatchQtyMin ? "decimal" : "numeric"}
                  autoComplete="off"
                  className="h-12 text-center text-lg font-medium tabular-nums"
                  value={qtyInput}
                  onChange={(e) => handleQtyChange(e.target.value)}
                  onBlur={handleQtyBlur}
                  aria-invalid={qtyInput.trim() !== "" && !parsedQty.ok}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="min-h-12 min-w-12 shrink-0"
                  aria-label="Increase quantity"
                  onClick={incrementQty}
                >
                  <Plus className="size-5" aria-hidden />
                </Button>
              </div>
              {overRemoval ? (
                <p className="text-xs text-destructive">
                  Cannot remove more than current stock ({systemStock}).
                </p>
              ) : qtyInput.trim() !== "" && !parsedQty.ok ? (
                <p className="text-xs text-destructive">
                  {usesBatchQtyMin
                    ? "Enter a quantity of at least 0.001."
                    : "Enter a valid quantity of at least 1."}
                </p>
              ) : null}
            </div>

            {isSupplierAddType(adjustmentType!) ? (
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                <label className="flex interactive-cursor items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={trackBatchDelivery}
                    onChange={(e) => setTrackBatchDelivery(e.target.checked)}
                    className="mt-0.5 size-4 rounded border-input"
                  />
                  <span>
                    <span className="font-medium text-foreground">
                      This delivery has a lot number or expiry date
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Leave off if you do not track batches for this delivery.
                    </span>
                  </span>
                </label>
                {trackBatchDelivery ? (
                  <div className="grid gap-3 border-t border-border/40 pt-3 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="adj-batch-number">Lot / batch number</Label>
                      <Input
                        id="adj-batch-number"
                        className="min-h-11"
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                        placeholder="e.g. LOT-2024-A"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adj-batch-expiry">Expiry date</Label>
                      <Input
                        id="adj-batch-expiry"
                        type="date"
                        className="min-h-11"
                        value={batchExpiry}
                        onChange={(e) => setBatchExpiry(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adj-batch-made">Made on (optional)</Label>
                      <Input
                        id="adj-batch-made"
                        type="date"
                        className="min-h-11"
                        value={batchManufactured}
                        onChange={(e) => setBatchManufactured(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground sm:col-span-2">
                      Uses the quantity above for this batch. Enter a lot number or expiry date.
                    </p>
                    {trackBatchDelivery && !supplierBatchMetaValid ? (
                      <p className="text-xs text-destructive sm:col-span-2">
                        Enter a lot number or expiry date, or turn off batch tracking.
                      </p>
                    ) : null}
                    {useBatchReceipt && !supplierBatchCostValid ? (
                      <p className="text-xs text-destructive sm:col-span-2">
                        This product needs a cost price before you can record a batch delivery. Set
                        it on the product first.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">After adjustment: </span>
              <span
                className={cn(
                  "font-medium tabular-nums",
                  newStock == null
                    ? "text-muted-foreground"
                    : signedDelta != null && signedDelta > 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : signedDelta != null && signedDelta < 0
                        ? "text-destructive"
                        : "text-foreground",
                )}
              >
                {newStock == null || !Number.isFinite(systemStock)
                  ? "-"
                  : `${newStock.toLocaleString()} (${formatSignedChange(signedDelta ?? 0)})`}
              </span>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="adj-notes">
                Notes
                {selectedOption.notesRequired ? (
                  <span className="text-muted-foreground"> (required)</span>
                ) : null}
              </Label>
              <Textarea
                id="adj-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={selectedOption.placeholder}
              />
              {selectedOption.notesRequired && notes.trim() !== "" && !notesValid ? (
                <p className="text-xs text-destructive">Notes are required for this adjustment.</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === "confirm" && product && selectedOption && signedDelta != null ? (
          <div className="grid gap-3 py-2">
            <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm">
              <dl className="grid gap-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Product</dt>
                  <dd className="font-medium text-foreground">{product.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Action</dt>
                  <dd className="font-medium text-foreground">{selectedOption.label}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Stock change</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {Number.isFinite(systemStock) ? systemStock : "-"} →{" "}
                    {newStock != null ? newStock : "-"}
                  </dd>
                </div>
                {notesTrimmed ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Notes</dt>
                    <dd className="text-foreground">{notesTrimmed}</dd>
                  </div>
                ) : null}
                {useBatchReceipt ? (
                  <>
                    <div>
                      <dt className="text-xs text-muted-foreground">Batch tracking</dt>
                      <dd className="font-medium text-foreground">Yes — new batch record</dd>
                    </div>
                    {batchNumber.trim() ? (
                      <div>
                        <dt className="text-xs text-muted-foreground">Lot / batch number</dt>
                        <dd className="font-mono text-foreground">{batchNumber.trim()}</dd>
                      </div>
                    ) : null}
                    {batchExpiry ? (
                      <div>
                        <dt className="text-xs text-muted-foreground">Expiry date</dt>
                        <dd className="text-foreground">{formatDateDMY(batchExpiry)}</dd>
                      </div>
                    ) : null}
                    {batchManufactured ? (
                      <div>
                        <dt className="text-xs text-muted-foreground">Made on</dt>
                        <dd className="text-foreground">{formatDateDMY(batchManufactured)}</dd>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </dl>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "choose" ? (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          ) : null}

          {step === "form" ? (
            <>
              <Button type="button" variant="outline" onClick={() => setStep("choose")}>
                Back
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!formValid}
                onClick={() => setStep("confirm")}
              >
                {selectedOption?.submitLabel ?? "Continue"}
              </Button>
            </>
          ) : null}

          {step === "confirm" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("form")}
                disabled={submitting}
              >
                Go back
              </Button>
              <Button
                type="button"
                className="gap-2"
                disabled={submitting || !formValid}
                onClick={() => void handleConfirm()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                    Applying…
                  </>
                ) : (
                  "Confirm"
                )}
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
