"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createOfflineLicenseCustomer } from "@/lib/api/platform/offline-license";
import { handleApiError } from "@/lib/api/errors";
import {
  OFFLINE_LICENSE_DEFAULT_AMOUNT_GHS,
  OFFLINE_LICENSE_DEFAULT_GRACE_DAYS,
  OFFLINE_LICENSE_DEFAULT_PERIOD_DAYS,
} from "@/lib/types/offline-license";

interface CreateOfflineShopModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOfflineShopModal({ open, onOpenChange }: CreateOfflineShopModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <CreateForm key={String(open)} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CreateForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [amountGhs, setAmountGhs] = useState(String(OFFLINE_LICENSE_DEFAULT_AMOUNT_GHS));
  const [periodDays, setPeriodDays] = useState(String(OFFLINE_LICENSE_DEFAULT_PERIOD_DAYS));
  const [graceDays, setGraceDays] = useState(String(OFFLINE_LICENSE_DEFAULT_GRACE_DAYS));
  const [supportNotes, setSupportNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createOfflineLicenseCustomer({
        name,
        phone: phone || undefined,
        email: email || undefined,
        amountGhs: Number(amountGhs),
        periodDays: Number(periodDays),
        graceDays: Number(graceDays),
        supportNotes: supportNotes || undefined,
      }),
    onSuccess: (shop) => {
      toast.success(`Created ${shop.name}. Issue an activation code next.`);
      queryClient.invalidateQueries({ queryKey: ["platform", "offline-shops"] });
      onClose();
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  const canSubmit = name.trim().length >= 2 && !mutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add offline shop</DialogTitle>
        <DialogDescription>
          Creates a license customer for the standalone PWA. Defaults are GHS{" "}
          {OFFLINE_LICENSE_DEFAULT_AMOUNT_GHS} / {OFFLINE_LICENSE_DEFAULT_PERIOD_DAYS} days — override
          per shop anytime.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="offline-shop-name">Business name</Label>
          <Input
            id="offline-shop-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Adom Pharmacy"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="offline-shop-phone">Phone</Label>
          <Input
            id="offline-shop-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="05…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="offline-shop-email">Email</Label>
          <Input
            id="offline-shop-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="optional"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="offline-shop-amount">Amount (GHS)</Label>
          <Input
            id="offline-shop-amount"
            inputMode="decimal"
            value={amountGhs}
            onChange={(e) => setAmountGhs(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="offline-shop-period">Period (days)</Label>
          <Input
            id="offline-shop-period"
            inputMode="numeric"
            value={periodDays}
            onChange={(e) => setPeriodDays(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="offline-shop-grace">Grace (days)</Label>
          <Input
            id="offline-shop-grace"
            inputMode="numeric"
            value={graceDays}
            onChange={(e) => setGraceDays(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="offline-shop-notes">Support notes</Label>
          <Textarea
            id="offline-shop-notes"
            value={supportNotes}
            onChange={(e) => setSupportNotes(e.target.value)}
            rows={3}
            placeholder="Location, contact person, special pricing…"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="button" disabled={!canSubmit} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Creating…" : "Create shop"}
        </Button>
      </DialogFooter>
    </>
  );
}
