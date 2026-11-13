"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { issueOfflineActivationCode } from "@/lib/api/platform/offline-license";
import { handleApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import { copyText } from "@/lib/offline-license-status";
import type {
  OfflineActivationCodeResponse,
  OfflineLicenseCustomer,
} from "@/lib/types/offline-license";

interface ActivationCodeDialogProps {
  shop: OfflineLicenseCustomer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivationCodeDialog({ shop, open, onOpenChange }: ActivationCodeDialogProps) {
  const [result, setResult] = useState<OfflineActivationCodeResponse | null>(null);
  const issuedRef = useRef(false);

  const mutation = useMutation({
    mutationFn: () => issueOfflineActivationCode(shop.id),
    onSuccess: (data) => {
      setResult(data);
      toast.success("Activation code issued.");
    },
    onError: (err) => {
      issuedRef.current = false;
      toast.error(handleApiError(err));
    },
  });

  useEffect(() => {
    if (!open) {
      issuedRef.current = false;
      setResult(null);
      return;
    }
    if (issuedRef.current) return;
    issuedRef.current = true;
    mutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- issue once per open
  }, [open, shop.id]);

  const onCopy = async () => {
    if (!result?.code) return;
    const ok = await copyText(result.code);
    toast[ok ? "success" : "error"](ok ? "Copied activation code" : "Could not copy");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5" aria-hidden />
            Activation code
          </DialogTitle>
          <DialogDescription>
            Send this to <strong>{shop.name}</strong>. They enter it on the device screen “Activate
            this device” (needs internet once).
          </DialogDescription>
        </DialogHeader>

        {mutation.isPending && !result ? (
          <p className="text-sm text-muted-foreground">Issuing code…</p>
        ) : null}

        {result ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border/50 bg-muted/40 px-4 py-5 text-center font-mono text-2xl font-semibold tracking-[0.2em]">
              {result.code}
            </div>
            <p className="text-xs text-muted-foreground">
              Expires {formatDate(result.expiresAt)} · one-time use · 14-day window
            </p>
          </div>
        ) : null}

        {!result && mutation.isError ? (
          <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Retry
          </Button>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={() => void onCopy()} disabled={!result?.code}>
            <Copy className="size-4" aria-hidden />
            Copy code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
