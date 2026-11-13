"use client";

import { Card } from "@/components/ui/card";
import { OfflineShopActionsMenu } from "@/components/platform/offline-shops/offline-shop-actions-menu";
import { OfflineShopStatusBadge } from "@/components/platform/offline-shops/status-badge";
import { formatDate } from "@/lib/format";
import { activeDeviceCount, amountGhsNumber } from "@/lib/offline-license-status";
import type { OfflineLicenseCustomer } from "@/lib/types/offline-license";

export function OfflineShopCard({ shop }: { shop: OfflineLicenseCustomer }) {
  const active = activeDeviceCount(shop);
  const total = shop.devices?.length ?? 0;

  return (
    <Card className="gap-3 p-4 md:hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{shop.name}</p>
          <p className="text-xs text-muted-foreground">{shop.phone || "No phone"}</p>
        </div>
        <OfflineShopActionsMenu shop={shop} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <OfflineShopStatusBadge shop={shop} />
        <span className="text-xs text-muted-foreground">
          GHS {amountGhsNumber(shop.amountGhs)} / {shop.periodDays}d
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        Valid until {formatDate(shop.validUntil)} ·{" "}
        {total === 0 ? "no device" : `${active}/${total} devices active`}
      </div>
    </Card>
  );
}
