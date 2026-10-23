"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  MoreVertical,
  Ban,
  CheckCircle,
  Trash2,
  Unlink,
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
import { ReleaseDeviceModal } from "@/components/platform/devices/release-device-modal";
import type { PlatformDevice } from "@/lib/types/platform";

type OpenModal = null | "suspend" | "unsuspend" | "revoke" | "release";

function deviceLabel(d: PlatformDevice): string {
  return d.deviceName ?? d.deviceModel ?? d.deviceUuid.slice(0, 12);
}

function ownerLabel(d: PlatformDevice): string {
  if (!d.user) return "No owner";
  return (
    [d.user.firstName, d.user.lastName].filter(Boolean).join(" ").trim() ||
    d.user.email ||
    "Unknown owner"
  );
}

interface DeviceActionsMenuProps {
  device: PlatformDevice;
  variant?: "row" | "header";
  /** Called after the phone row is deleted. The detail page uses this to leave the missing record. */
  onReleased?: () => void;
}

export function DeviceActionsMenu({
  device,
  variant = "row",
  onReleased,
}: DeviceActionsMenuProps) {
  const [openModal, setOpenModal] = useState<OpenModal>(null);
  const label = deviceLabel(device);
  const canRelease = device.deviceUuid.trim().length > 0;
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
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!canRelease}
            title={canRelease ? undefined : "This device has no phone id to release"}
            onClick={() => setOpenModal("release")}
          >
            <Unlink className="size-4" aria-hidden />
            Release phone
          </DropdownMenuItem>
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
      <ReleaseDeviceModal
        device={{ deviceUuid: device.deviceUuid, label, owner: ownerLabel(device) }}
        open={openModal === "release"}
        onOpenChange={(o) => setOpenModal(o ? "release" : null)}
        onReleased={onReleased}
      />
    </>
  );
}
