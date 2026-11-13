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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extendOfflineLicense } from "@/lib/api/platform/offline-license";
import { handleApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import { copyText } from "@/lib/offline-license-status";
import type {
  OfflineLicenseCustomer,
  OfflineLicenseUnlockResponse,
} from "@/lib/types/offline-license";

interface ExtendDialogProps {
  shop: OfflineLicenseCustomer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExtendDialog({ shop, open, onOpenChange }: ExtendDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <ExtendForm key={`${shop.id}-${String(open)}`} shop={shop} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ExtendForm({
  shop,
  onClose,
}: {
  shop: OfflineLicenseCustomer;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(String(shop.periodDays));
  const [result, setResult] = useState<OfflineLicenseUnlockResponse | null>(null);

  const mutation = useMutation({
    mutationFn: () => extendOfflineLicense(shop.id, Number(days)),
    onSuccess: (data) => {
      setResult(data);
      toast.success("Subscription extended.");
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
          <DialogTitle>Extended</DialogTitle>
          <DialogDescription>
            Valid until <strong>{formatDate(result.validUntil)}</strong>
          </DialogDescription>
        </DialogHeader>
        {result.unlockToken ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Unlock token for support handoff:</p>
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

  const daysNum = Number(days);
  const canSubmit = Number.isFinite(daysNum) && daysNum >= 1 && daysNum <= 3650 && !mutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Extend subscription</DialogTitle>
        <DialogDescription>
          Add days to <strong>{shop.name}</strong> from max(now, current valid until).
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label htmlFor="extend-days">Days to add</Label>
        <Input
          id="extend-days"
          inputMode="numeric"
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="button" disabled={!canSubmit} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Extending…" : "Extend"}
        </Button>
      </DialogFooter>
    </>
  );
}
