"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OfflineShopActionsMenu } from "@/components/platform/offline-shops/offline-shop-actions-menu";
import { OfflineShopStatusBadge } from "@/components/platform/offline-shops/status-badge";
import { formatDate } from "@/lib/format";
import { activeDeviceCount, amountGhsNumber } from "@/lib/offline-license-status";
import type { OfflineLicenseCustomer } from "@/lib/types/offline-license";

export function OfflineShopsTable({ shops }: { shops: OfflineLicenseCustomer[] }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border/40 md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Shop</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Device</TableHead>
            <TableHead>Valid until</TableHead>
            <TableHead className="w-12 text-right"> </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shops.map((shop) => {
            const devices = shop.devices ?? [];
            const active = activeDeviceCount(shop);
            return (
              <TableRow key={shop.id}>
                <TableCell>
                  <div className="font-medium">{shop.name}</div>
                  <div className="text-xs text-muted-foreground">{shop.phone || "—"}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {shop.id.slice(0, 8)}…
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  GHS {amountGhsNumber(shop.amountGhs)} / {shop.periodDays}d
                  <div className="text-xs text-muted-foreground">grace {shop.graceDays}d</div>
                </TableCell>
                <TableCell>
                  <OfflineShopStatusBadge shop={shop} />
                </TableCell>
                <TableCell className="text-sm">
                  {devices.length === 0
                    ? "None"
                    : `${active} active${devices.length > active ? ` · ${devices.length - active} revoked` : ""}`}
                </TableCell>
                <TableCell className="text-sm">{formatDate(shop.validUntil)}</TableCell>
                <TableCell className="text-right">
                  <OfflineShopActionsMenu shop={shop} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
