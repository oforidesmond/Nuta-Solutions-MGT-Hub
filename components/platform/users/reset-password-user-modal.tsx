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
      <DialogContent className="border-border/40 bg-card/95 backdrop-blur-md sm:max-w-lg">
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
  /** Default off so the operator always gets a copyable temporary password (API only returns it when false). */
  const [notifyUser, setNotifyUser] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      resetPlatformUserPassword(user.id, {
        reason: reason.trim(),
        notifyUser,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["platform"] });
      if (data.temporaryPassword) {
        setTempPassword(data.temporaryPassword);
        toast.success("Password reset · copy the temporary password below.");
        return;
      }
      toast.success(
        notifyUser
          ? "Password reset · user notified in-app."
          : "Password reset completed · no temporary password was returned.",
      );
      onClose();
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
            Share this with {user.displayName} through a verified channel. It is shown once.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">User</p>
            <p className="font-medium tracking-tight">{user.displayName}</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Temporary password</p>
            <div className="rounded-xl border-2 border-primary/50 bg-primary/5 px-4 py-4 text-center font-mono text-2xl font-bold tracking-wide text-primary break-all">
              {tempPassword}
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(tempPassword);
                toast.success("Copied to clipboard");
              } catch {
                toast.error("Could not copy · select the password manually.");
              }
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
            <li>Temporary password generated for you to copy and send</li>
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

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={notifyUser}
            onChange={(e) => setNotifyUser(e.target.checked)}
            className="mt-0.5 size-4 rounded"
          />
          <span className="leading-snug">
            Also notify user via in-app system alert
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Leave unchecked to receive the temporary password here so you can copy and send it.
              The API only returns the password when this is off.
            </span>
          </span>
        </label>

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
