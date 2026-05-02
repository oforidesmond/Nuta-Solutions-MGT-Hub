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
import { revokePlatformDevice } from "@/lib/api/platform/devices";
import { handleApiError } from "@/lib/api/errors";

interface DeviceLite {
  id: string;
  label: string;
}

interface RevokeDeviceModalProps {
  device: DeviceLite;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RevokeDeviceModal({ device, open, onOpenChange }: RevokeDeviceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <RevokeForm key={String(open)} device={device} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function RevokeForm({ device, onClose }: { device: DeviceLite; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const mutation = useMutation({
    mutationFn: () => revokePlatformDevice(device.id, { reason: reason.trim() }),
    onSuccess: () => {
      toast.success("Device revoked.");
      queryClient.invalidateQueries({ queryKey: ["platform"] });
      onClose();
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  const canSubmit = reason.trim().length > 0 && confirmed && !mutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" aria-hidden />
          Revoke device
        </DialogTitle>
        <DialogDescription>This action cannot be undone. Unsuspend never restores revoked devices.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="rounded-lg border border-border/40 bg-muted/30 p-3 font-mono text-xs">
          {device.label}
        </div>

        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <ul className="list-disc space-y-0.5 pl-5 text-xs">
            <li>Status set to revoked with timestamp + reason recorded</li>
            <li>All refresh tokens for this device UUID are revoked</li>
          </ul>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="revoke-device-reason">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="revoke-device-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <p className="text-right text-[0.7rem] text-muted-foreground">{reason.length} / 500</p>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 size-4 rounded"
          />
          <span>I understand this device permanently loses network access credentials.</span>
        </label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" onClick={() => mutation.mutate()} disabled={!canSubmit}>
          {mutation.isPending ? "Revoking…" : "Revoke device"}
        </Button>
      </DialogFooter>
    </>
  );
}
