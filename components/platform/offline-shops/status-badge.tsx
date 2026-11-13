"use client";

import { Badge } from "@/components/ui/badge";
import {
  deriveOfflineShopStatus,
  offlineShopStatusLabel,
  type OfflineShopStatusKind,
} from "@/lib/offline-license-status";
import type { OfflineLicenseCustomer } from "@/lib/types/offline-license";
import { cn } from "@/lib/utils";

const kindClass: Record<OfflineShopStatusKind, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  expiring: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  expired: "border-destructive/40 bg-destructive/10 text-destructive",
  not_activated: "border-border bg-muted text-muted-foreground",
  inactive: "border-border bg-muted text-muted-foreground",
};

export function OfflineShopStatusBadge({
  shop,
  className,
}: {
  shop: Pick<OfflineLicenseCustomer, "isActive" | "validUntil">;
  className?: string;
}) {
  const kind = deriveOfflineShopStatus(shop);
  return (
    <Badge variant="outline" className={cn(kindClass[kind], className)}>
      {offlineShopStatusLabel(kind)}
    </Badge>
  );
}
