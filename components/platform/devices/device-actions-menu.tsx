"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  MoreVertical,
  Ban,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SuspendDeviceModal } from "@/components/platform/devices/suspend-device-modal";
import { UnsuspendDeviceModal } from "@/components/platform/devices/unsuspend-device-modal";
import { RevokeDeviceModal } from "@/components/platform/devices/revoke-device-modal";
import type { PlatformDevice } from "@/lib/types/platform";

type OpenModal = null | "suspend" | "unsuspend" | "revoke";

function deviceLabel(d: PlatformDevice): string {
  return d.deviceName ?? d.deviceModel ?? d.deviceUuid.slice(0, 12);
}

interface DeviceActionsMenuProps {
  device: PlatformDevice;
  variant?: "row" | "header";
}

export function DeviceActionsMenu({ device, variant = "row" }: DeviceActionsMenuProps) {
  const [openModal, setOpenModal] = useState<OpenModal>(null);
  const label = deviceLabel(device);
  const detailHref = `/platform/devices/${device.id}`;
  const isRevoked = device.status === "REVOKED";
  const isSuspended = device.status === "SUSPENDED";
  const isActive = device.status === "ACTIVE";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            variant === "row" ? (
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${label}`} />
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                aria-label={`Actions for ${label}`}
              />
            )
          }
        >
          {variant === "row" ? (
            <MoreVertical className="size-4" aria-hidden />
          ) : (
            <>
              Actions
              <MoreVertical className="size-4" aria-hidden />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem render={<Link href={detailHref} />}>
            <ExternalLink className="size-4" aria-hidden />
            View details
          </DropdownMenuItem>
          {device.organization ? (
            <DropdownMenuItem
              render={<Link href={`/platform/organizations/${device.organization.id}`} />}
            >
              Organization
            </DropdownMenuItem>
          ) : null}
          {device.userId ? (
            <DropdownMenuItem render={<Link href={`/platform/users/${device.userId}`} />}>
              Owner profile
            </DropdownMenuItem>
          ) : null}

          {!isRevoked ? (
            <>
              <DropdownMenuSeparator />
              {isActive ? (
                <>
                  <DropdownMenuItem onClick={() => setOpenModal("suspend")}>
                    <Ban className="size-4" aria-hidden />
                    Suspend
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => setOpenModal("revoke")}>
                    <Trash2 className="size-4" aria-hidden />
                    Revoke
                  </DropdownMenuItem>
                </>
              ) : isSuspended ? (
                <DropdownMenuItem onClick={() => setOpenModal("unsuspend")}>
                  <CheckCircle className="size-4" aria-hidden />
                  Unsuspend
                </DropdownMenuItem>
              ) : null}
            </>
          ) : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled title="Revoked devices cannot change status">
                <Ban className="size-4" aria-hidden />
                Revoked
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <SuspendDeviceModal
        device={{ id: device.id, label }}
        open={openModal === "suspend"}
        onOpenChange={(o) => setOpenModal(o ? "suspend" : null)}
      />
      <UnsuspendDeviceModal
        device={{ id: device.id, label }}
        open={openModal === "unsuspend"}
        onOpenChange={(o) => setOpenModal(o ? "unsuspend" : null)}
      />
      <RevokeDeviceModal
        device={{ id: device.id, label }}
        open={openModal === "revoke"}
        onOpenChange={(o) => setOpenModal(o ? "revoke" : null)}
      />
    </>
  );
}
