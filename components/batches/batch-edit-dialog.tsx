"use client";

import { useEffect, useState } from "react";
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
import { updateBatch } from "@/lib/api/batches";
import { buildBatchUpdateBody, toDateInputValue } from "@/lib/batch-helpers";
import { handleApiError } from "@/lib/api/errors";
import type { HubBatch } from "@/lib/types/domain";

type BatchEditDialogProps = {
  batch: HubBatch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
};

function batchProductLabel(batch: HubBatch): string {
  return batch.product?.name ?? batch.productName ?? "Product";
}

export function BatchEditDialog(props: BatchEditDialogProps) {
  const { batch, open, onOpenChange, onSaved } = props;
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryInput, setExpiryInput] = useState("");
  const [manufacturedInput, setManufacturedInput] = useState("");
  const [notes, setNotes] = useState("");
  const [initialBatchNumber, setInitialBatchNumber] = useState("");
  const [initialExpiry, setInitialExpiry] = useState("");
  const [initialManufactured, setInitialManufactured] = useState("");
  const [initialNotes, setInitialNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !batch) return;
    const number = batch.batchNumber?.trim() ?? "";
    const expiry = toDateInputValue(batch.expiryDate);
    const manufactured = toDateInputValue(batch.manufacturedDate);
    const noteText = batch.notes?.trim() ?? "";
    setBatchNumber(number);
    setExpiryInput(expiry);
    setManufacturedInput(manufactured);
    setNotes(noteText);
    setInitialBatchNumber(number);
    setInitialExpiry(expiry);
    setInitialManufactured(manufactured);
    setInitialNotes(noteText);
    setSaving(false);
  }, [open, batch]);

  const remainingQty = batch?.remainingQuantity ?? batch?.quantity ?? "-";

  async function handleSave() {
    if (!batch?.id) return;
    const body = buildBatchUpdateBody({
      initialBatchNumber,
      batchNumber,
      initialExpiry,
      expiryInput,
      initialManufactured,
      manufacturedInput,
      initialNotes,
      notes,
    });
    if (Object.keys(body).length === 0) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      await updateBatch(batch.id, body);
      toast.success("Batch updated");
      onOpenChange(false);
      await onSaved();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit batch</DialogTitle>
          <DialogDescription>
            Update lot number, dates, or notes. Stock quantity is not changed here.
          </DialogDescription>
        </DialogHeader>

        {batch ? (
          <div className="grid gap-4 py-2">
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium text-foreground">{batchProductLabel(batch)}</p>
              <p className="text-xs text-muted-foreground">
                {batch.branchName ? `${batch.branchName} · ` : ""}
                {String(remainingQty)} units left in this batch
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="be-batch-number">Lot / batch number</Label>
              <Input
                id="be-batch-number"
                className="min-h-11"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. LOT-2024-A"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="be-expiry">Expiry date</Label>
                {initialExpiry ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => setExpiryInput("")}
                  >
                    Clear expiry
                  </Button>
                ) : null}
              </div>
              <Input
                id="be-expiry"
                type="date"
                className="min-h-11"
                value={expiryInput}
                onChange={(e) => setExpiryInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Clear the date to remove expiry tracking for this batch.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="be-manufactured">Made on (optional)</Label>
              <Input
                id="be-manufactured"
                type="date"
                className="min-h-11"
                value={manufacturedInput}
                onChange={(e) => setManufacturedInput(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="be-notes">Notes</Label>
              <Textarea
                id="be-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this batch"
              />
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" className="gap-2" disabled={saving || !batch} onClick={() => void handleSave()}>
            {saving ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
