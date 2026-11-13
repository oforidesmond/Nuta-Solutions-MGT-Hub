"use client";

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
import { revokeOfflineLicenseDevice } from "@/lib/api/platform/offline-license";
import { handleApiError } from "@/lib/api/errors";
import type { OfflineLicenseCustomer, OfflineLicenseDevice } from "@/lib/types/offline-license";

interface RevokeOfflineDeviceDialogProps {
  shop: OfflineLicenseCustomer;
  device: OfflineLicenseDevice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RevokeOfflineDeviceDialog({
  shop,
  device,
  open,
  onOpenChange,
}: RevokeOfflineDeviceDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => revokeOfflineLicenseDevice(shop.id, device.deviceId),
    onSuccess: () => {
      toast.success("Device revoked. Shop must re-activate with a new code.");
      queryClient.invalidateQueries({ queryKey: ["platform", "offline-shops"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(handleApiError(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" aria-hidden />
            Revoke device
          </DialogTitle>
          <DialogDescription>
            Unbinds this device from <strong>{shop.name}</strong>. The shop must get a new activation
            code to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border/40 bg-muted/30 p-3 font-mono text-xs break-all">
          {device.deviceId}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Revoking…" : "Revoke device"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
