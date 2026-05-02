"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";
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
import { unsuspendOrganization } from "@/lib/api/platform/organizations";
import { handleApiError } from "@/lib/api/errors";
import type { PlanStatus, PlatformOrganization } from "@/lib/types/platform";

const RESTORE_OPTIONS: { value: PlanStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active (default)" },
  { value: "TRIAL_EXPIRED", label: "Trial expired" },
  { value: "PAYMENT_OVERDUE", label: "Payment overdue" },
];

interface UnsuspendOrganizationModalProps {
  org: PlatformOrganization;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnsuspendOrganizationModal({
  org,
  open,
  onOpenChange,
}: UnsuspendOrganizationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <UnsuspendForm
          key={String(open)}
          org={org}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function UnsuspendForm({
  org,
  onClose,
}: {
  org: PlatformOrganization;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [planStatus, setPlanStatus] = useState<PlanStatus>("ACTIVE");

  const mutation = useMutation({
    mutationFn: () =>
      unsuspendOrganization(org.id, { reason: reason.trim(), planStatus }),
    onSuccess: () => {
      toast.success(`${org.name} has been restored.`);
      queryClient.invalidateQueries({ queryKey: ["platform"] });
      onClose();
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  const trimmedReason = reason.trim();
  const canSubmit = trimmedReason.length > 0 && !mutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="size-5" aria-hidden />
          Unsuspend organization
        </DialogTitle>
        <DialogDescription>
          Restores the organization. Logins, syncing, sales, and inventory
          operations resume immediately.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-sm">
          <p className="font-medium text-foreground">{org.name}</p>
          <p className="text-xs text-muted-foreground">
            {org.email ?? "No email"} · {org.planType} plan
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="unsuspend-status">Restore to status</Label>
          <select
            id="unsuspend-status"
            value={planStatus}
            onChange={(e) => setPlanStatus(e.target.value as PlanStatus)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {RESTORE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="unsuspend-reason">
            Reason for restoring <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="unsuspend-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. Payment dispute resolved, account reinstated"
          />
          <p className="text-right text-[0.7rem] text-muted-foreground">
            {reason.length} / 500
          </p>
        </div>
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
        <Button type="button" onClick={() => mutation.mutate()} disabled={!canSubmit}>
          {mutation.isPending ? "Restoring…" : "Unsuspend organization"}
        </Button>
      </DialogFooter>
    </>
  );
}
