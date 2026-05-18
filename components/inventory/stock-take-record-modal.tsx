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
import { createStockTake } from "@/lib/api/stock-takes";
import { fetchBranchesList } from "@/lib/api/branches";
import { handleApiError } from "@/lib/api/errors";
import { productQuantity } from "@/lib/stock-status";
import type { HubBranchOption } from "@/lib/types/staff";
import type { HubProduct } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

function activeBranches(list: HubBranchOption[]): HubBranchOption[] {
  return list.filter((b) => b.isActive !== false);
}

function parseNonNegativeDecimal(raw: string): { ok: true; value: number } | { ok: false } {
  const t = raw.trim();
  if (t === "") return { ok: false };
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return { ok: false };
  return { ok: true, value: n };
}

function formatQtyLabel(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return String(n);
}

export function StockTakeRecordModal(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: HubProduct | null;
  onRecorded: () => void | Promise<void>;
}) {
  const { open, onOpenChange, product, onRecorded } = props;
  const [physicalInput, setPhysicalInput] = useState("");
  const [notes, setNotes] = useState("");
  const [branchId, setBranchId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const branchesQuery = useQuery({
    queryKey: ["branches", "list"],
    queryFn: fetchBranchesList,
    enabled: open,
    staleTime: 60_000,
  });

  const branches = activeBranches(branchesQuery.data ?? []);
  const showBranchSelector = branches.length > 1;

  const systemStock = product ? productQuantity(product) : NaN;

  useEffect(() => {
    if (!open) {
      setPhysicalInput("");
      setNotes("");
      setBranchId("");
      setSubmitting(false);
    }
  }, [open]);

  const parsedPhysical = useMemo(() => parseNonNegativeDecimal(physicalInput), [physicalInput]);

  const difference = useMemo(() => {
    if (!product || !Number.isFinite(systemStock) || !parsedPhysical.ok) return null;
    return parsedPhysical.value - systemStock;
  }, [product, systemStock, parsedPhysical]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    if (!parsedPhysical.ok) {
      toast.error("Enter a valid physical count (zero or greater).");
      return;
    }
    setSubmitting(true);
    try {
      const row = await createStockTake({
        productId: product.id,
        physicalCount: parsedPhysical.value,
        notes: notes.trim() || undefined,
        branchId: showBranchSelector && branchId ? branchId : undefined,
      });
      const before = formatQtyLabel(row.quantityBefore);
      const after = formatQtyLabel(row.quantityAfter);
      const ch = formatQtyLabel(row.quantityChange);
      const sign = Number(row.quantityChange) > 0 ? "+" : "";
      toast.success(`Stock count saved. ${before} → ${after} (${sign}${ch}).`);
      onOpenChange(false);
      await onRecorded();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={(ev) => void handleSubmit(ev)}>
          <DialogHeader>
            <DialogTitle>Record stock count</DialogTitle>
            <DialogDescription>
              Enter the physical count on hand. The system updates inventory to match.
            </DialogDescription>
          </DialogHeader>
          {product ? (
            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label>Product</Label>
                <p className="text-sm font-medium text-foreground">{product.name}</p>
              </div>
              <div className="grid gap-1.5">
                <Label>SKU</Label>
                <p className="font-mono text-sm text-muted-foreground">{product.sku?.trim() ? product.sku : "—"}</p>
              </div>
              <div className="grid gap-1.5">
                <Label>Current system stock</Label>
                <p className="tabular-nums text-sm font-medium">{Number.isFinite(systemStock) ? systemStock : "—"}</p>
              </div>
              {showBranchSelector ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="st-branch">Branch</Label>
                  <select
                    id="st-branch"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                  >
                    <option value="">Default (no specific branch)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Optional — use when this count applies to a specific branch.</p>
                </div>
              ) : null}
              <div className="grid gap-1.5">
                <Label htmlFor="st-physical">Physical count</Label>
                <Input
                  id="st-physical"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={physicalInput}
                  onChange={(e) => setPhysicalInput(e.target.value)}
                  aria-invalid={physicalInput.trim() !== "" && !parsedPhysical.ok}
                  required
                />
                {physicalInput.trim() !== "" && !parsedPhysical.ok ? (
                  <p className="text-xs text-destructive">Must be a number greater than or equal to zero.</p>
                ) : null}
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Difference (physical − system): </span>
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    difference == null
                      ? "text-muted-foreground"
                      : difference > 0
                        ? "text-emerald-700 dark:text-emerald-400"
                        : difference < 0
                          ? "text-destructive"
                          : "text-foreground",
                  )}
                >
                  {difference == null || !Number.isFinite(systemStock) ? "—" : difference.toLocaleString()}
                </span>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="st-notes">Notes</Label>
                <Textarea id="st-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context for this count" />
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="gap-2"
              disabled={submitting || !product || !parsedPhysical.ok}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save stock count"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
