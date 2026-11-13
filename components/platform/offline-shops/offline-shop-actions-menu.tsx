"use client";

import { useState } from "react";
import {
  Ban,
  CalendarPlus,
  Eye,
  KeyRound,
  MoreVertical,
  Pencil,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActivationCodeDialog } from "@/components/platform/offline-shops/activation-code-dialog";
import { EditOfflineShopModal } from "@/components/platform/offline-shops/edit-offline-shop-modal";
import { ExtendDialog } from "@/components/platform/offline-shops/extend-dialog";
import { MarkPaidDialog } from "@/components/platform/offline-shops/mark-paid-dialog";
import { OfflineShopDetailSheet } from "@/components/platform/offline-shops/offline-shop-detail-sheet";
import { RevokeOfflineDeviceDialog } from "@/components/platform/offline-shops/revoke-device-dialog";
import type { OfflineLicenseCustomer, OfflineLicenseDevice } from "@/lib/types/offline-license";

type OpenModal =
  | null
  | "details"
  | "create-code"
  | "mark-paid"
  | "extend"
  | "edit"
  | { type: "revoke"; device: OfflineLicenseDevice };

interface OfflineShopActionsMenuProps {
  shop: OfflineLicenseCustomer;
}

export function OfflineShopActionsMenu({ shop }: OfflineShopActionsMenuProps) {
  const [openModal, setOpenModal] = useState<OpenModal>(null);
  const activeDevices = (shop.devices ?? []).filter((d) => !d.revokedAt);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${shop.name}`}
            />
          }
        >
          <MoreVertical className="size-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setOpenModal("details")}>
            <Eye className="size-4" aria-hidden />
            View details
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setOpenModal("create-code")}
            disabled={!shop.isActive}
          >
            <KeyRound className="size-4" aria-hidden />
            Issue activation code
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenModal("mark-paid")}>
            <Wallet className="size-4" aria-hidden />
            Mark paid
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenModal("extend")}>
            <CalendarPlus className="size-4" aria-hidden />
            Extend days
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenModal("edit")}>
            <Pencil className="size-4" aria-hidden />
            Edit shop
          </DropdownMenuItem>
          {activeDevices.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              {activeDevices.map((device) => (
                <DropdownMenuItem
                  key={device.id}
                  variant="destructive"
                  onClick={() => setOpenModal({ type: "revoke", device })}
                >
                  <Ban className="size-4" aria-hidden />
                  Revoke {device.deviceId.slice(0, 12)}…
                </DropdownMenuItem>
              ))}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <OfflineShopDetailSheet
        shop={shop}
        open={openModal === "details"}
        onOpenChange={(open) => setOpenModal(open ? "details" : null)}
      />
      <ActivationCodeDialog
        shop={shop}
        open={openModal === "create-code"}
        onOpenChange={(open) => setOpenModal(open ? "create-code" : null)}
      />
      <MarkPaidDialog
        shop={shop}
        open={openModal === "mark-paid"}
        onOpenChange={(open) => setOpenModal(open ? "mark-paid" : null)}
      />
      <ExtendDialog
        shop={shop}
        open={openModal === "extend"}
        onOpenChange={(open) => setOpenModal(open ? "extend" : null)}
      />
      <EditOfflineShopModal
        shop={shop}
        open={openModal === "edit"}
        onOpenChange={(open) => setOpenModal(open ? "edit" : null)}
      />
      {typeof openModal === "object" && openModal?.type === "revoke" ? (
        <RevokeOfflineDeviceDialog
          shop={shop}
          device={openModal.device}
          open
          onOpenChange={(open) => {
            if (!open) setOpenModal(null);
          }}
        />
      ) : null}
    </>
  );
}
