"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, HardDrive } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  downloadOfflineLicenseBackup,
  fetchOfflineLicenseBackup,
} from "@/lib/api/platform/offline-license";
import { handleApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import type { OfflineLicenseCustomer } from "@/lib/types/offline-license";

interface OfflineShopBackupsSheetProps {
  shop: OfflineLicenseCustomer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function OfflineShopBackupsSheet({
  shop,
  open,
  onOpenChange,
}: OfflineShopBackupsSheetProps) {
  const shopId = shop?.id ?? "";

  const backupQuery = useQuery({
    queryKey: ["platform", "offline-shops", shopId, "backup"],
    queryFn: () => fetchOfflineLicenseBackup(shopId),
    enabled: open && Boolean(shopId),
    retry: false,
  });

  const embedded = shop?.backup ?? null;
  const backup = backupQuery.data ?? (backupQuery.isError ? null : embedded);
  const notFound =
    backupQuery.isError ||
    (!backupQuery.isFetching && !backup && !embedded && open);

  const downloadMutation = useMutation({
    mutationFn: () => downloadOfflineLicenseBackup(shopId),
    onSuccess: () => toast.success("Backup download started."),
    onError: (err) => toast.error(handleApiError(err)),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {shop ? (
          <>
            <SheetHeader>
              <SheetTitle>Backups</SheetTitle>
              <SheetDescription>
                Cloud backup for {shop.name}. Each upload from the shop replaces the previous file.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4 text-sm">
              {backupQuery.isPending && !embedded ? (
                <p className="text-muted-foreground text-xs">Loading backup…</p>
              ) : notFound || !backup ? (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-center space-y-2">
                  <HardDrive className="mx-auto size-8 text-muted-foreground" aria-hidden />
                  <p className="font-medium">No cloud backup yet</p>
                  <p className="text-muted-foreground text-xs">
                    When this shop is activated and online, the offline app uploads one backup per
                    day (overwriting the previous).
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-border/40 p-4 space-y-3">
                  <div className="space-y-1">
                    <p className="font-medium">Latest backup</p>
                    <p className="text-muted-foreground text-xs">
                      Received {formatDate(backup.receivedAt)}
                      {backup.createdAtClient
                        ? ` · created on device ${formatDate(backup.createdAtClient)}`
                        : null}
                    </p>
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                    <dt className="text-muted-foreground">Size</dt>
                    <dd>{formatBytes(backup.byteSize)}</dd>
                    <dt className="text-muted-foreground">Device</dt>
                    <dd className="font-mono break-all">{backup.deviceId}</dd>
                    <dt className="text-muted-foreground">App</dt>
                    <dd>{backup.appVersion}</dd>
                    {backup.originalFilename ? (
                      <>
                        <dt className="text-muted-foreground">File</dt>
                        <dd className="break-all">{backup.originalFilename}</dd>
                      </>
                    ) : null}
                  </dl>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={downloadMutation.isPending}
                    onClick={() => downloadMutation.mutate()}
                  >
                    <Download className="size-4" aria-hidden />
                    {downloadMutation.isPending ? "Downloading…" : "Download backup"}
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
