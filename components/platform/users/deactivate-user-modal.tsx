"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deactivatePlatformUser } from "@/lib/api/platform/users";
import { handleApiError } from "@/lib/api/errors";

interface TargetUserLite {
  id: string;
  displayName: string;
  organizationId?: string | null;
}

interface DeactivateUserModalProps {
  user: TargetUserLite;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeactivateUserModal({ user, open, onOpenChange }: DeactivateUserModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DeactivateForm key={String(open)} user={user} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function DeactivateForm({
  user,
  onClose,
}: {
  user: TargetUserLite;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const mutation = useMutation({
    mutationFn: () => deactivatePlatformUser(user.id, { reason: reason.trim() }),
    onSuccess: () => {
      toast.success("User has been deactivated.");
      queryClient.invalidateQueries({ queryKey: ["platform"] });
      onClose();
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  const canSubmit =
    reason.trim().length > 0 && confirmed && !mutation.isPending && Boolean(user.organizationId);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" aria-hidden />
          Deactivate user
        </DialogTitle>
        <DialogDescription>
          Deactivation signs the user out everywhere by revoking all refresh tokens for this account.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-sm">
          <p className="font-medium text-foreground">{user.displayName}</p>
          {!user.organizationId ? (
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Platform administrators without an organization cannot be deactivated via this action.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Tenant user · organization linked</p>
          )}
        </div>

        {user.organizationId ? (
          <>
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <p className="font-semibold">This action will:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
                <li>Set the account to inactive</li>
                <li>Revoke every outstanding refresh token for this user</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deactivate-user-reason">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="deactivate-user-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <p className="text-right text-[0.7rem] text-muted-foreground">
                {reason.length} / 500
              </p>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 size-4 rounded"
              />
              <span>I understand this user cannot sign in until the account is restored on the tenant side.</span>
            </label>
          </>
        ) : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit}
        >
          {mutation.isPending ? "Deactivating…" : "Deactivate user"}
        </Button>
      </DialogFooter>
    </>
  );
}
