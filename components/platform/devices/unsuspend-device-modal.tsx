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
import { unsuspendPlatformDevice } from "@/lib/api/platform/devices";
import { handleApiError } from "@/lib/api/errors";

interface DeviceLite {
  id: string;
  label: string;
}

interface UnsuspendDeviceModalProps {
  device: DeviceLite;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnsuspendDeviceModal({ device, open, onOpenChange }: UnsuspendDeviceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <UnsuspendForm key={String(open)} device={device} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function UnsuspendForm({ device, onClose }: { device: DeviceLite; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () => unsuspendPlatformDevice(device.id, { reason: reason.trim() }),
    onSuccess: () => {
      toast.success("Device unsuspended.");
      queryClient.invalidateQueries({ queryKey: ["platform"] });
      onClose();
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  const canSubmit = reason.trim().length > 0 && !mutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Unsuspend device</DialogTitle>
        <DialogDescription>Restores a suspended device to active. Revoked devices cannot be unsuspended.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="rounded-lg border border-border/40 bg-muted/30 p-3 font-mono text-xs">{device.label}</div>
        <div className="space-y-1.5">
          <Label htmlFor="unsuspend-device-reason">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="unsuspend-device-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <p className="text-right text-[0.7rem] text-muted-foreground">{reason.length} / 500</p>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="button" onClick={() => mutation.mutate()} disabled={!canSubmit}>
          {mutation.isPending ? "Restoring…" : "Unsuspend device"}
        </Button>
      </DialogFooter>
    </>
  );
}
