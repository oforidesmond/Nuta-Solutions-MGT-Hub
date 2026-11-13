"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { amountGhsNumber } from "@/lib/offline-license-status";
import type { OfflineLicenseCustomer } from "@/lib/types/offline-license";

interface OfflineShopDetailSheetProps {
  shop: OfflineLicenseCustomer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OfflineShopDetailSheet({ shop, open, onOpenChange }: OfflineShopDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {shop ? (
          <>
            <SheetHeader>
              <SheetTitle>{shop.name}</SheetTitle>
              <SheetDescription className="font-mono text-xs">{shop.id}</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6 text-sm">
              <section className="space-y-1">
                <h3 className="font-medium">Plan</h3>
                <p>
                  GHS {amountGhsNumber(shop.amountGhs)} / {shop.periodDays}d · grace {shop.graceDays}d
                </p>
                <p className="text-muted-foreground">Valid until {formatDate(shop.validUntil)}</p>
                {shop.supportNotes ? (
                  <p className="rounded-md border border-border/40 bg-muted/20 p-2 text-xs">
                    {shop.supportNotes}
                  </p>
                ) : null}
              </section>

              <section className="space-y-2">
                <h3 className="font-medium">Devices ({shop.devices?.length ?? 0})</h3>
                {(shop.devices ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-xs">No device bound yet.</p>
                ) : (
                  (shop.devices ?? []).map((d) => (
                    <div
                      key={d.id}
                      className="rounded-lg border border-border/40 p-3 space-y-1"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={d.revokedAt ? "destructive" : "secondary"}>
                          {d.revokedAt ? "Revoked" : "Active"}
                        </Badge>
                        {d.clockTamperReported ? (
                          <Badge variant="outline">Clock tamper</Badge>
                        ) : null}
                      </div>
                      <p className="font-mono text-[11px] break-all">{d.deviceId}</p>
                      <p className="text-xs text-muted-foreground">
                        Bound {formatDate(d.boundAt)} · last seen {formatDate(d.lastSeenAt)}
                      </p>
                    </div>
                  ))
                )}
              </section>

              <section className="space-y-2">
                <h3 className="font-medium">Activation codes</h3>
                {(shop.activationCodes ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-xs">None issued yet.</p>
                ) : (
                  (shop.activationCodes ?? []).map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-border/40 px-3 py-2">
                      <span className="font-mono text-sm tracking-wider">{c.code}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.usedAt ? `Used ${formatDate(c.usedAt)}` : `Open · exp ${formatDate(c.expiresAt)}`}
                      </span>
                    </div>
                  ))
                )}
              </section>

              <section className="space-y-2">
                <h3 className="font-medium">Payments</h3>
                {(shop.payments ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-xs">No payment records.</p>
                ) : (
                  (shop.payments ?? []).map((p) => (
                    <div key={p.id} className="rounded-md border border-border/40 px-3 py-2 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline">{p.status}</Badge>
                        <span className="text-xs">GHS {amountGhsNumber(p.amountGhs)}</span>
                      </div>
                      <p className="font-mono text-[11px] break-all">{p.reference}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</p>
                    </div>
                  ))
                )}
              </section>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
