"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { markOfflineLicensePaid } from "@/lib/api/platform/offline-license";
import { handleApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import { amountGhsNumber, copyText } from "@/lib/offline-license-status";
import type {
  OfflineLicenseCustomer,
  OfflineLicenseUnlockResponse,
} from "@/lib/types/offline-license";

interface MarkPaidDialogProps {
  shop: OfflineLicenseCustomer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarkPaidDialog({ shop, open, onOpenChange }: MarkPaidDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <MarkPaidForm key={`${shop.id}-${String(open)}`} shop={shop} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function MarkPaidForm({
  shop,
  onClose,
}: {
  shop: OfflineLicenseCustomer;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<OfflineLicenseUnlockResponse | null>(null);

  const mutation = useMutation({
    mutationFn: () => markOfflineLicensePaid(shop.id),
    onSuccess: (data) => {
      setResult(data);
      toast.success("Marked paid and subscription extended.");
      queryClient.invalidateQueries({ queryKey: ["platform", "offline-shops"] });
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  const onCopyToken = async () => {
    if (!result?.unlockToken) return;
    const ok = await copyText(result.unlockToken);
    toast[ok ? "success" : "error"](ok ? "Copied unlock token" : "Could not copy");
  };

  if (result) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Payment recorded</DialogTitle>
          <DialogDescription>
            Valid until <strong>{formatDate(result.validUntil)}</strong>
            {result.deviceId ? (
              <>
                {" "}
                · device <span className="font-mono text-xs">{result.deviceId.slice(0, 24)}…</span>
              </>
            ) : (
              " · no device bound yet — shop can activate with a new code"
            )}
          </DialogDescription>
        </DialogHeader>
        {result.unlockToken ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Support unlock token (paste into the shop paywall if they cannot refresh online):
            </p>
            <div className="max-h-28 overflow-auto rounded-md border border-border/50 bg-muted/30 p-2 font-mono text-[11px] break-all">
              {result.unlockToken}
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Done
          </Button>
          {result.unlockToken ? (
            <Button type="button" onClick={() => void onCopyToken()}>
              <Copy className="size-4" aria-hidden />
              Copy unlock token
            </Button>
          ) : null}
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Mark paid</DialogTitle>
        <DialogDescription>
          Extends <strong>{shop.name}</strong> by {shop.periodDays} days at GHS{" "}
          {amountGhsNumber(shop.amountGhs)}. Use after MoMo payment or manual settlement.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Updating…" : "Confirm mark paid"}
        </Button>
      </DialogFooter>
    </>
  );
}
