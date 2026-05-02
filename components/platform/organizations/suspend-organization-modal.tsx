"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
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
import { suspendOrganization } from "@/lib/api/platform/organizations";
import { handleApiError } from "@/lib/api/errors";
import type { PlatformOrganization } from "@/lib/types/platform";

interface SuspendOrganizationModalProps {
  org: PlatformOrganization;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuspendOrganizationModal({
  org,
  open,
  onOpenChange,
}: SuspendOrganizationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <SuspendForm
          key={String(open)}
          org={org}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function SuspendForm({
  org,
  onClose,
}: {
  org: PlatformOrganization;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [notifyOwner, setNotifyOwner] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      suspendOrganization(org.id, { reason: reason.trim(), notifyOwner }),
    onSuccess: () => {
      toast.success(`${org.name} has been suspended.`);
      queryClient.invalidateQueries({ queryKey: ["platform"] });
      onClose();
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  const trimmedReason = reason.trim();
  const canSubmit = trimmedReason.length > 0 && confirmed && !mutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" aria-hidden />
          Suspend organization
        </DialogTitle>
        <DialogDescription>
          Suspending an organization immediately blocks all access for its users
          and devices.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-sm">
          <p className="font-medium text-foreground">{org.name}</p>
          <p className="text-xs text-muted-foreground">
            {org.email ?? "No email"} · {org.planType} plan
          </p>
        </div>

        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <p className="font-semibold">This action will:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
            <li>Block all users from logging in</li>
            <li>Prevent devices from syncing</li>
            <li>Stop sales and inventory operations on /sync, /sales, /inventory</li>
            <li>Notify the organization owner (if enabled below)</li>
          </ul>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="suspend-reason">
            Reason for suspension <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="suspend-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. Payment dispute investigation"
          />
          <p className="text-right text-[0.7rem] text-muted-foreground">
            {reason.length} / 500
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={notifyOwner}
            onChange={(e) => setNotifyOwner(e.target.checked)}
            className="size-4 rounded"
          />
          <span>Send an in-app notification to the organization owner</span>
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 size-4 rounded"
          />
          <span>
            I understand this immediately blocks all operations for this
            organization until it is unsuspended.
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
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit}
        >
          {mutation.isPending ? "Suspending…" : "Suspend organization"}
        </Button>
      </DialogFooter>
    </>
  );
}
