"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Unlink } from "lucide-react";
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
import { releasePlatformDevice } from "@/lib/api/platform/devices";
import { handleApiError } from "@/lib/api/errors";

interface ReleaseDeviceTarget {
  deviceUuid: string;
  label: string;
  owner: string;
}

interface ReleaseDeviceModalProps {
  device: ReleaseDeviceTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful release. Detail view uses this to leave the deleted record. */
  onReleased?: () => void;
}

export function ReleaseDeviceModal({
  device,
  open,
  onOpenChange,
  onReleased,
}: ReleaseDeviceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <ReleaseForm
          key={String(open)}
          device={device}
          onClose={() => onOpenChange(false)}
          onReleased={onReleased}
        />
      </DialogContent>
    </Dialog>
  );
}

function ReleaseForm({
  device,
  onClose,
  onReleased,
}: {
  device: ReleaseDeviceTarget;
  onClose: () => void;
  onReleased?: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      releasePlatformDevice({
        deviceUuid: device.deviceUuid,
        reason: reason.trim(),
      }),
    onSuccess: () => {
      toast.success(
        "Phone released. On the device, tap Retry so it can bind to the account that just signed in.",
      );
      queryClient.invalidateQueries({ queryKey: ["platform"] });
      onClose();
      onReleased?.();
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  const canSubmit = reason.trim().length > 0 && confirmed && !mutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Unlink className="size-5" aria-hidden />
          Release phone
        </DialogTitle>
        <DialogDescription>
          This deletes the phone&apos;s registration so the next NutaPOS setup can bind it.
          Revoke only marks the row and leaves the setup error in place.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-1 rounded-lg border border-border/40 bg-muted/30 p-3 text-xs">
          <p className="font-medium text-foreground">{device.label}</p>
          <p className="font-mono text-muted-foreground">{device.deviceUuid}</p>
          <p className="text-muted-foreground">Current owner: {device.owner}</p>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
            <li>Deletes this phone&apos;s device row so the next setup can bind it</li>
            <li>Revokes refresh tokens tied to this phone</li>
            <li>Writes a release audit row that keeps the previous owner</li>
          </ul>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="release-device-reason">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="release-device-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Phone still registered to another user"
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
          <span>
            I understand this phone will be unbound. The person on the device should tap Retry on
            the setup screen.
          </span>
        </label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button type="button" onClick={() => mutation.mutate()} disabled={!canSubmit}>
          {mutation.isPending ? "Releasing…" : "Release phone"}
        </Button>
      </DialogFooter>
    </>
  );
}
