"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { softDeleteOrganization } from "@/lib/api/platform/organizations";
import { handleApiError } from "@/lib/api/errors";
import { useAppNavigate } from "@/lib/hooks/use-app-navigate";
import type { PlatformOrganization } from "@/lib/types/platform";

interface DeleteOrganizationModalProps {
  org: PlatformOrganization;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteOrganizationModal({
  org,
  open,
  onOpenChange,
}: DeleteOrganizationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DeleteForm
          key={String(open)}
          org={org}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function DeleteForm({
  org,
  onClose,
}: {
  org: PlatformOrganization;
  onClose: () => void;
}) {
  const { navigate } = useAppNavigate();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      softDeleteOrganization(org.id, {
        reason: reason.trim(),
        confirmDelete: true,
      }),
    onSuccess: () => {
      toast.success(`${org.name} has been deleted.`);
      queryClient.invalidateQueries({ queryKey: ["platform"] });
      onClose();
      navigate("/platform/organizations");
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  const trimmedReason = reason.trim();
  const canSubmit =
    trimmedReason.length > 0 && confirmDelete && !mutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="size-5" aria-hidden />
          Delete organization
        </DialogTitle>
        <DialogDescription>
          Soft deletes the organization. The record stays in the database for
          recovery; PII is anonymized.
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
            <li>
              Mark the organization inactive (
              <code className="font-mono">isActive=false</code>)
            </li>
            <li>Clear the organization&apos;s email and phone (PII anonymization)</li>
            <li>Block all logins, syncing, and tenant API calls</li>
            <li>
              Record a <code className="font-mono">PLATFORM_ORG_DELETED</code> audit
              event
            </li>
          </ul>
          <p className="mt-2 text-xs">
            The data itself is retained - contact engineering for hard deletion.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="delete-reason">
            Reason for deletion <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="delete-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. GDPR right-to-be-forgotten request #4521"
          />
          <p className="text-right text-[0.7rem] text-muted-foreground">
            {reason.length} / 500
          </p>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmDelete}
            onChange={(e) => setConfirmDelete(e.target.checked)}
            className="mt-0.5 size-4 rounded"
          />
          <span>
            I understand this anonymizes the organization&apos;s PII and blocks
            all access. I have authorization to perform this deletion.
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
          {mutation.isPending ? "Deleting…" : "Delete organization"}
        </Button>
      </DialogFooter>
    </>
  );
}
