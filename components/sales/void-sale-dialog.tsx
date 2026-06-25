"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { voidSale } from "@/lib/api/sales";
import { handleApiError } from "@/lib/api/errors";
import type { HubSale } from "@/lib/types/domain";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { withBranchKey } from "@/lib/query/branch-query-keys";
import { productLifecycleKeys } from "@/lib/query/product-lifecycle-keys";
import { reportKeys } from "@/lib/query/report-keys";

const MIN_REASON_LENGTH = 10;

type Props = {
  sale: HubSale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function VoidSaleDialog({ sale, open, onOpenChange, onSuccess }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/40 bg-card/95 backdrop-blur-md sm:max-w-lg">
        <VoidSaleForm
          key={String(open)}
          sale={sale}
          onClose={() => onOpenChange(false)}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}

function VoidSaleForm({
  sale,
  onClose,
  onSuccess,
}: {
  sale: HubSale;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const activeBranchId = useActiveBranchId();
  const [voidReason, setVoidReason] = useState("");
  const [confirmVoid, setConfirmVoid] = useState(false);

  const receipt =
    sale.receiptNumber?.trim() || sale.receiptNumberMobile?.trim() || sale.id.slice(0, 8);

  const mutation = useMutation({
    mutationFn: () => voidSale(sale.id, { voidReason: voidReason.trim() }),
    onSuccess: () => {
      const productIds = [
        ...new Set(
          (sale.items ?? [])
            .map((line) => line.productId)
            .filter((id): id is string => Boolean(id?.trim())),
        ),
      ];

      void queryClient.invalidateQueries({
        queryKey: withBranchKey(activeBranchId, "sales", "detail", sale.id),
      });
      void queryClient.invalidateQueries({
        queryKey: withBranchKey(activeBranchId, "sales"),
      });
      void queryClient.invalidateQueries({
        queryKey: productLifecycleKeys.all(activeBranchId),
      });
      for (const productId of productIds) {
        void queryClient.invalidateQueries({
          queryKey: withBranchKey(activeBranchId, "product-lifecycle", productId),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: withBranchKey(activeBranchId, "dashboard"),
      });
      void queryClient.invalidateQueries({
        queryKey: reportKeys.all(activeBranchId),
      });

      toast.success(`Sale ${receipt} has been cancelled.`);
      onClose();
      onSuccess?.();
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  const trimmedReason = voidReason.trim();
  const canSubmit =
    trimmedReason.length >= MIN_REASON_LENGTH && confirmVoid && !mutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-destructive">
          <Ban className="size-5" aria-hidden />
          Cancel this sale
        </DialogTitle>
        <DialogDescription>
          This is recorded in your activity log and cannot be undone.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-sm">
          <p className="font-medium text-foreground">
            Receipt{" "}
            <span className="font-mono">{receipt}</span>
          </p>
        </div>

        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <p className="font-semibold">This will:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
            <li>Put stock back on your shelves</li>
            <li>Reverse the sale from your totals</li>
            <li>Record the cancellation in the activity log</li>
          </ul>
          <p className="mt-2 text-xs font-medium">
            This cannot be undone.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="void-reason">
            Reason for cancellation <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="void-reason"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. Customer was charged twice by mistake"
          />
          <p className="text-right text-[0.7rem] text-muted-foreground">
            {trimmedReason.length} / 500
            {trimmedReason.length > 0 && trimmedReason.length < MIN_REASON_LENGTH
              ? ` · at least ${MIN_REASON_LENGTH} characters`
              : null}
          </p>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmVoid}
            onChange={(e) => setConfirmVoid(e.target.checked)}
            className="mt-0.5 size-4 rounded"
          />
          <span>
            I understand this puts stock back, reverses the sale from my totals,
            and is recorded in the activity log. This cannot be undone.
          </span>
        </label>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={mutation.isPending}
        >
          Keep sale
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit}
        >
          {mutation.isPending ? "Cancelling…" : "Cancel sale"}
        </Button>
      </DialogFooter>
    </>
  );
}
