"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { resetPlatformUserPassword } from "@/lib/api/platform/users";
import { handleApiError } from "@/lib/api/errors";

interface TargetUserLite {
  id: string;
  displayName: string;
}

interface ResetPasswordUserModalProps {
  user: TargetUserLite;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResetPasswordUserModal({ user, open, onOpenChange }: ResetPasswordUserModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <ResetPasswordForm key={String(open)} user={user} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordForm({
  user,
  onClose,
}: {
  user: TargetUserLite;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [notifyUser, setNotifyUser] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      resetPlatformUserPassword(user.id, {
        reason: reason.trim(),
        notifyUser,
      }),
    onSuccess: (data) => {
      toast.success(
        notifyUser
          ? "Password reset · user notified in-app."
          : "Password reset · copy the temporary password below.",
      );
      queryClient.invalidateQueries({ queryKey: ["platform"] });
      if (!notifyUser && data.temporaryPassword) {
        setTempPassword(data.temporaryPassword);
      } else {
        onClose();
      }
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  const canSubmit = reason.trim().length > 0 && confirmed && !mutation.isPending;

  if (tempPassword) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Temporary password</DialogTitle>
          <DialogDescription>
            Share this value through a verified channel · it is shown once.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <code className="block rounded-lg border bg-muted px-3 py-2 font-mono text-sm break-all">
            {tempPassword}
          </code>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={async () => {
              await navigator.clipboard.writeText(tempPassword);
              toast.success("Copied");
            }}
          >
            Copy to clipboard
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Reset password</DialogTitle>
        <DialogDescription>
          Issues a temporary password and revokes existing refresh tokens for {user.displayName}.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-sm">
          <p className="font-medium text-foreground">{user.displayName}</p>
          <p className="text-xs text-muted-foreground">User ID · {user.id}</p>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <p className="font-semibold text-amber-900 dark:text-amber-200">Effects</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-amber-900/90 dark:text-amber-100/90">
            <li>Bcrypt-hashed temporary password stored server-side</li>
            <li>User must change password on next login</li>
            <li>All refresh tokens for this user revoked immediately</li>
          </ul>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reset-reason">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="reset-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="e.g. Customer support ticket #1234"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={notifyUser}
            onChange={(e) => setNotifyUser(e.target.checked)}
            className="size-4 rounded"
          />
          <span>Notify user via in-app system alert</span>
        </label>

        {!notifyUser ? (
          <p className="text-xs text-muted-foreground">
            When unchecked, you will receive the temporary password once to relay out-of-band.
          </p>
        ) : null}

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 size-4 rounded"
          />
          <span>I understand this locks the user out until they authenticate with the new password.</span>
        </label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="button" onClick={() => mutation.mutate()} disabled={!canSubmit}>
          {mutation.isPending ? "Resetting…" : "Reset password"}
        </Button>
      </DialogFooter>
    </>
  );
}
