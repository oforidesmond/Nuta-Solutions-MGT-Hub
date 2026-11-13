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
import { updateOfflineLicenseCustomer } from "@/lib/api/platform/offline-license";
import { handleApiError } from "@/lib/api/errors";
import { amountGhsNumber } from "@/lib/offline-license-status";
import type { OfflineLicenseCustomer } from "@/lib/types/offline-license";

interface EditOfflineShopModalProps {
  shop: OfflineLicenseCustomer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditOfflineShopModal({ shop, open, onOpenChange }: EditOfflineShopModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <EditForm key={`${shop.id}-${String(open)}`} shop={shop} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  shop,
  onClose,
}: {
  shop: OfflineLicenseCustomer;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(shop.name);
  const [phone, setPhone] = useState(shop.phone ?? "");
  const [email, setEmail] = useState(shop.email ?? "");
  const [amountGhs, setAmountGhs] = useState(String(amountGhsNumber(shop.amountGhs)));
  const [periodDays, setPeriodDays] = useState(String(shop.periodDays));
  const [graceDays, setGraceDays] = useState(String(shop.graceDays));
  const [supportNotes, setSupportNotes] = useState(shop.supportNotes ?? "");
  const [isActive, setIsActive] = useState(shop.isActive);

  const mutation = useMutation({
    mutationFn: () =>
      updateOfflineLicenseCustomer(shop.id, {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        amountGhs: Number(amountGhs),
        periodDays: Number(periodDays),
        graceDays: Number(graceDays),
        supportNotes: supportNotes.trim() || null,
        isActive,
      }),
    onSuccess: () => {
      toast.success("Shop updated.");
      queryClient.invalidateQueries({ queryKey: ["platform", "offline-shops"] });
      onClose();
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  const canSubmit = name.trim().length >= 2 && !mutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit shop</DialogTitle>
        <DialogDescription>
          Change plan price/duration for future renewals, contact details, or deactivate the shop.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="edit-offline-shop-name">Business name</Label>
          <Input
            id="edit-offline-shop-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-offline-shop-phone">Phone</Label>
          <Input
            id="edit-offline-shop-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-offline-shop-email">Email</Label>
          <Input
            id="edit-offline-shop-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-offline-shop-amount">Amount (GHS)</Label>
          <Input
            id="edit-offline-shop-amount"
            inputMode="decimal"
            value={amountGhs}
            onChange={(e) => setAmountGhs(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-offline-shop-period">Period (days)</Label>
          <Input
            id="edit-offline-shop-period"
            inputMode="numeric"
            value={periodDays}
            onChange={(e) => setPeriodDays(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-offline-shop-grace">Grace (days)</Label>
          <Input
            id="edit-offline-shop-grace"
            inputMode="numeric"
            value={graceDays}
            onChange={(e) => setGraceDays(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="edit-offline-shop-notes">Support notes</Label>
          <Textarea
            id="edit-offline-shop-notes"
            value={supportNotes}
            onChange={(e) => setSupportNotes(e.target.value)}
            rows={3}
          />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-4 rounded border-input"
          />
          Shop is active (can receive new activation codes)
        </label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="button" disabled={!canSubmit} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </>
  );
}
